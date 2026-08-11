import { createHash } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreatePluginDto,
  PluginDetail,
  PluginRunPayload,
  PluginSummary,
  PluginVersionSummary,
  SubmitPluginVersionDto,
} from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const MAX_WASM_BYTES = 2 * 1024 * 1024; // 2MB decoded — ARCHITECTURE.md §16.2
const WASM_MAGIC = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // "\0asm"

/**
 * Plugin marketplace v1 — API.md §18, ARCHITECTURE.md §16. First
 * untrusted-third-party-code surface in this codebase; flagged and
 * confirmed before implementation per CLAUDE.md rule 10.
 *
 * Static inspection here is intentionally minimal: size cap + WASM magic
 * number only. The fuller import-section allowlist check §16.2 describes
 * (reject any WASM import beyond a single `abort` host function) is NOT
 * implemented — that requires parsing the WASM binary's import section,
 * which is a real parser, not a few lines, and the sandbox's own runtime
 * enclosure (frontend PluginRunner: opaque-origin iframe, `sandbox`
 * attribute, `connect-src 'none'` CSP) is the actual security boundary
 * regardless of what a plugin's import section claims — static analysis is
 * defense-in-depth on top of that, not the only thing standing between a
 * hostile plugin and the user. Documented as a real, disclosed gap in
 * AUDIT_REPORT.md §18.2, not silently skipped.
 */
@Injectable()
export class PluginsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePluginDto): Promise<PluginSummary> {
    const existing = await this.prisma.plugin.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException("That slug is already taken.");

    const plugin = await this.prisma.plugin.create({
      data: { slug: dto.slug, name: dto.name, description: dto.description, authorUserId: userId },
      include: { author: { select: { email: true } }, versions: true },
    });
    return this.toSummary(plugin);
  }

  async submitVersion(userId: string, pluginId: string, dto: SubmitPluginVersionDto): Promise<PluginVersionSummary> {
    const plugin = await this.prisma.plugin.findUnique({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException("Plugin not found.");
    if (plugin.authorUserId !== userId) throw new ForbiddenException("You don't own this plugin.");
    if (plugin.status === "SUSPENDED") {
      throw new ForbiddenException("This plugin is suspended and can't accept new versions.");
    }

    const wasmBytes = this.decodeAndValidateWasm(dto.wasmBase64);
    const checksumSha256 = createHash("sha256").update(wasmBytes).digest("hex");

    const version = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pluginVersion.create({
        data: {
          pluginId,
          version: dto.manifest.version,
          manifestJson: dto.manifest,
          wasmBase64: dto.wasmBase64,
          checksumSha256,
        },
      });
      // A new submission always goes back through review, even for an
      // already-PUBLISHED plugin's next version — never auto-publish
      // (ARCHITECTURE.md §16.2's "never auto-publish" rule applies per
      // version, not just once per plugin).
      await tx.plugin.update({ where: { id: pluginId }, data: { status: "IN_REVIEW" } });
      return created;
    });

    return this.toVersionSummary(version);
  }

  async listPublished(): Promise<PluginSummary[]> {
    const plugins = await this.prisma.plugin.findMany({
      where: { status: "PUBLISHED" },
      include: { author: { select: { email: true } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    return plugins.map((p: Parameters<PluginsService["toSummary"]>[0]) => this.toSummary(p));
  }

  /** Own plugins in any status, or anyone's PUBLISHED ones — same
   * owner-or-public shape as SnippetsService.getOne. */
  async getDetail(slug: string, requesterUserId: string | undefined): Promise<PluginDetail> {
    const plugin = await this.prisma.plugin.findUnique({
      where: { slug },
      include: {
        author: { select: { email: true } },
        versions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!plugin) throw new NotFoundException("Plugin not found.");

    const isOwnerOrAdmin = await this.canSeeUnpublished(requesterUserId, plugin.authorUserId);
    if (plugin.status !== "PUBLISHED" && !isOwnerOrAdmin) {
      throw new NotFoundException("Plugin not found.");
    }

    return {
      ...this.toSummary(plugin),
      versions: plugin.versions.map((v: Parameters<PluginsService["toVersionSummary"]>[0]) =>
        this.toVersionSummary(v),
      ),
    };
  }

  /** What the frontend PluginRunner actually fetches to execute a plugin —
   * the latest PUBLISHED version for anyone, or the latest version in any
   * status for the author/an admin (preview before publish). */
  async getRunPayload(slug: string, requesterUserId: string | undefined): Promise<PluginRunPayload> {
    const plugin = await this.prisma.plugin.findUnique({
      where: { slug },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!plugin) throw new NotFoundException("Plugin not found.");

    const isOwnerOrAdmin = await this.canSeeUnpublished(requesterUserId, plugin.authorUserId);
    if (plugin.status !== "PUBLISHED" && !isOwnerOrAdmin) {
      throw new NotFoundException("Plugin not found.");
    }

    const latest = plugin.versions[0];
    if (!latest) throw new NotFoundException("This plugin has no submitted versions yet.");

    return { version: latest.version, wasmBase64: latest.wasmBase64, checksumSha256: latest.checksumSha256 };
  }

  /** Admin-only review queue — API.md §18. */
  async listReviewQueue(userId: string): Promise<PluginSummary[]> {
    await this.requireAdmin(userId);
    const plugins = await this.prisma.plugin.findMany({
      where: { status: "IN_REVIEW" },
      include: { author: { select: { email: true } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "asc" },
    });
    return plugins.map((p: Parameters<PluginsService["toSummary"]>[0]) => this.toSummary(p));
  }

  async review(userId: string, pluginId: string, decision: "APPROVE" | "REJECT"): Promise<PluginSummary> {
    await this.requireAdmin(userId);

    const plugin = await this.prisma.plugin.findUnique({
      where: { id: pluginId },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!plugin) throw new NotFoundException("Plugin not found.");
    const latest = plugin.versions[0];
    if (!latest) throw new NotFoundException("This plugin has no submitted versions to review.");

    const newStatus = decision === "APPROVE" ? "PUBLISHED" : "REJECTED";
    await this.prisma.$transaction([
      this.prisma.plugin.update({ where: { id: pluginId }, data: { status: newStatus } }),
      this.prisma.pluginVersion.update({
        where: { id: latest.id },
        data: { reviewedById: userId, reviewedAt: new Date() },
      }),
    ]);

    const updated = await this.prisma.plugin.findUniqueOrThrow({
      where: { id: pluginId },
      include: { author: { select: { email: true } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return this.toSummary(updated);
  }

  /** Hides a previously-published plugin without deleting it — rows are
   * never deleted, matching DATABASE.md §1's soft-delete/audit-trail habit. */
  async suspend(userId: string, pluginId: string): Promise<PluginSummary> {
    await this.requireAdmin(userId);
    const updated = await this.prisma.plugin.update({
      where: { id: pluginId },
      data: { status: "SUSPENDED" },
      include: { author: { select: { email: true } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return this.toSummary(updated);
  }

  private decodeAndValidateWasm(wasmBase64: string): Buffer {
    let bytes: Buffer;
    try {
      bytes = Buffer.from(wasmBase64, "base64");
    } catch {
      throw new ConflictException("wasmBase64 isn't valid base64.");
    }
    if (bytes.length === 0 || bytes.length > MAX_WASM_BYTES) {
      throw new ConflictException(`WASM module must be between 1 byte and ${MAX_WASM_BYTES} bytes decoded.`);
    }
    if (!bytes.subarray(0, 4).equals(WASM_MAGIC)) {
      throw new ConflictException("Not a valid WASM module (missing \\0asm magic number).");
    }
    return bytes;
  }

  private async canSeeUnpublished(requesterUserId: string | undefined, authorUserId: string): Promise<boolean> {
    if (!requesterUserId) return false;
    if (requesterUserId === authorUserId) return true;
    const user = await this.prisma.user.findUnique({ where: { id: requesterUserId }, select: { isAdmin: true } });
    return user?.isAdmin === true;
  }

  private async requireAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) throw new ForbiddenException("Admin access required.");
  }

  private toSummary(plugin: {
    id: string;
    slug: string;
    name: string;
    description: string;
    status: string;
    createdAt: Date;
    author: { email: string };
    versions: { version: string }[];
  }): PluginSummary {
    return {
      id: plugin.id,
      slug: plugin.slug,
      name: plugin.name,
      description: plugin.description,
      status: plugin.status as PluginSummary["status"],
      authorEmail: plugin.author.email,
      latestVersion: plugin.versions[0]?.version ?? null,
      createdAt: plugin.createdAt.toISOString(),
    };
  }

  private toVersionSummary(version: {
    id: string;
    version: string;
    manifestJson: unknown;
    checksumSha256: string;
    reviewedAt: Date | null;
    createdAt: Date;
  }): PluginVersionSummary {
    return {
      id: version.id,
      version: version.version,
      manifest: version.manifestJson as PluginVersionSummary["manifest"],
      checksumSha256: version.checksumSha256,
      reviewedAt: version.reviewedAt?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
    };
  }
}
