import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import type { CreateShareLinkDto, ShareLinkResult, ShareLinkView } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const SLUG_LENGTH = 12;
const DEFAULT_EXPIRY_DAYS = 30;
const MAX_PAYLOAD_BYTES = 200_000;

/** Short share links — API.md §8. Anonymous creation is allowed
 * (`userId` nullable on ShareLink per DATABASE.md), so ownership for
 * delete only applies when the link *was* created by a signed-in user;
 * anonymous-created links simply can't be deleted early (they still
 * expire on schedule). Optional org attribution + branding on the public
 * view (AUDIT_REPORT.md §22) — a link created without an `organizationId`
 * behaves exactly as before that feature. */
@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string | undefined, dto: CreateShareLinkDto): Promise<ShareLinkResult> {
    const size = Buffer.byteLength(JSON.stringify(dto.payload), "utf8");
    if (size > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException(`Payload too large (${size} bytes, max ${MAX_PAYLOAD_BYTES}).`);
    }

    // Attaching org attribution requires being signed in *and* a member of
    // that org — an anonymous caller (userId undefined) can never set this,
    // since there's no caller identity to check membership against, and a
    // Zod-valid organizationId from a signed-in non-member is rejected
    // rather than silently dropped (fail loud, not fail open).
    if (dto.organizationId) {
      if (!userId) {
        throw new ForbiddenException("Sign in to share as an organization.");
      }
      const membership = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: dto.organizationId, userId } },
      });
      if (!membership) {
        throw new ForbiddenException("You're not a member of that organization.");
      }
    }

    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60_000);
    const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "https://devtoolbox.dev";
    const link = await this.prisma.shareLink.create({
      data: {
        slug: nanoid(SLUG_LENGTH),
        userId: userId ?? null,
        organizationId: dto.organizationId ?? null,
        toolSlug: dto.toolSlug,
        // dto.payload is Zod-validated as Record<string, unknown> (already
        // JSON-serializable, it came from a parsed request body) but
        // Prisma's generated Json input type is the stricter
        // Prisma.InputJsonValue — see pipelines.service.ts's toInputJson
        // for the same cast, done inline here since it's used once.
        payload: dto.payload as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    return {
      slug: link.slug,
      url: `${frontendUrl}/s/${link.slug}`,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
  }

  async resolve(slug: string): Promise<ShareLinkView> {
    const link = await this.prisma.shareLink.findUnique({
      where: { slug },
      include: { organization: { select: { brandName: true, brandLogoUrl: true } } },
    });
    if (!link || (link.expiresAt && link.expiresAt < new Date())) {
      throw new NotFoundException("This share link doesn't exist or has expired.");
    }

    await this.prisma.shareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 } } });

    // Branding only shown if the org actually set a name — a share
    // attributed to a branding-less org still falls back to default
    // DevToolbox branding, same as a non-org share.
    const branding = link.organization?.brandName
      ? { name: link.organization.brandName, logoUrl: link.organization.brandLogoUrl }
      : null;

    return {
      toolSlug: link.toolSlug,
      payload: link.payload as Record<string, unknown>,
      createdAt: link.createdAt.toISOString(),
      branding,
    };
  }

  async remove(userId: string, slug: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException("This share link doesn't exist.");
    if (link.userId !== userId) throw new ForbiddenException("You don't own this share link.");
    await this.prisma.shareLink.delete({ where: { id: link.id } });
  }
}
