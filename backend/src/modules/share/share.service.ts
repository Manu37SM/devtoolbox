import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import type { CreateShareLinkDto, ShareLinkResult } from "@devtoolbox/shared";
import { PrismaService } from "../../database/prisma.service";

const SLUG_LENGTH = 12;
const DEFAULT_EXPIRY_DAYS = 30;
const MAX_PAYLOAD_BYTES = 200_000;

/** Short share links — API.md §8. Anonymous creation is allowed
 * (`userId` nullable on ShareLink per DATABASE.md), so ownership for
 * delete only applies when the link *was* created by a signed-in user;
 * anonymous-created links simply can't be deleted early (they still
 * expire on schedule). */
@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string | undefined, dto: CreateShareLinkDto): Promise<ShareLinkResult> {
    const size = Buffer.byteLength(JSON.stringify(dto.payload), "utf8");
    if (size > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException(`Payload too large (${size} bytes, max ${MAX_PAYLOAD_BYTES}).`);
    }

    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60_000);
    const link = await this.prisma.shareLink.create({
      data: {
        slug: nanoid(SLUG_LENGTH),
        userId: userId ?? null,
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
      url: `https://devtoolbox.dev/s/${link.slug}`,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
  }

  async resolve(slug: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { slug } });
    if (!link || (link.expiresAt && link.expiresAt < new Date())) {
      throw new NotFoundException("This share link doesn't exist or has expired.");
    }

    await this.prisma.shareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 } } });
    return { toolSlug: link.toolSlug, payload: link.payload, createdAt: link.createdAt.toISOString() };
  }

  async remove(userId: string, slug: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException("This share link doesn't exist.");
    if (link.userId !== userId) throw new ForbiddenException("You don't own this share link.");
    await this.prisma.shareLink.delete({ where: { id: link.id } });
  }
}
