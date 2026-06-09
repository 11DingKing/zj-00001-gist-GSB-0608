import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Visibility } from '@prisma/client';
import * as Diff from 'diff';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateGistDto, UpdateGistDto, CursorPaginationDto, SearchGistsDto } from './dto';

@Injectable()
export class GistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private readonly POPULAR_GISTS_CACHE_KEY = 'popular_gists';
  private readonly CACHE_TTL = 5 * 60;

  private buildSearchVector(title: string, description: string, files: { filename: string; content: string }[]): string {
    const fileContent = files.map(f => `${f.filename} ${f.content}`).join(' ');
    return `${title} ${description || ''} ${fileContent}`;
  }

  private async updateGistStarsCount(gistId: string) {
    const count = await this.prisma.star.count({
      where: { gistId },
    });
    await this.prisma.gist.update({
      where: { id: gistId },
      data: { starsCount: count },
    });
  }

  async listPublicGists(
    pagination: CursorPaginationDto,
    language?: string,
    currentUserId?: string,
  ) {
    const pageSize = pagination.limit || 20;
    const where: Prisma.GistWhereInput = {
      visibility: Visibility.PUBLIC,
    };

    if (language) {
      where.files = {
        some: { language },
      };
    }

    if (pagination.cursor) {
      const cursorGist = await this.prisma.gist.findUnique({
        where: { id: pagination.cursor },
        select: { updatedAt: true },
      });
      if (cursorGist) {
        where.updatedAt = { lt: cursorGist.updatedAt };
      }
    }

    const gists = await this.prisma.gist.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: pageSize + 1,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        files: {
          orderBy: { order: 'asc' },
          take: 1,
        },
        tags: true,
      },
    });

    let nextCursor: string | null = null;
    if (gists.length > pageSize) {
      const nextItem = gists.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: gists,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  async searchGists(searchDto: SearchGistsDto, currentUserId?: string) {
    const pageSize = searchDto.limit || 20;
    const query = searchDto.query.trim();

    if (!query) {
      return {
        data: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const cursorRank = searchDto.cursor
      ? await this.getGistRank(searchDto.cursor, query)
      : null;

    const visibilityConditions: string[] = [];
    const params: any[] = [query];
    let paramIndex = 1;

    if (currentUserId) {
      paramIndex++;
      params.push(currentUserId);
      visibilityConditions.push(`
        ("visibility" = 'PUBLIC'::"Visibility") OR
        ("visibility" = 'UNLISTED'::"Visibility" AND "authorId" = $${paramIndex})
      `);
    } else {
      visibilityConditions.push(`"visibility" = 'PUBLIC'::"Visibility"`);
    }

    const whereConditions = `
      "searchVector" @@ plainto_tsquery('english', $1)
      AND (${visibilityConditions.join(' OR ')})
    `;

    let cursorCondition = '';
    if (cursorRank !== null && searchDto.cursor) {
      paramIndex++;
      params.push(cursorRank);
      paramIndex++;
      params.push(searchDto.cursor);
      cursorCondition = `
        AND (
          ts_rank("searchVector", plainto_tsquery('english', $1)) < $${paramIndex - 1}
          OR (
            ts_rank("searchVector", plainto_tsquery('english', $1)) = $${paramIndex - 1}
            AND "id" < $${paramIndex}
          )
        )
      `;
    }

    const sqlQuery = `
      SELECT 
        g.*,
        ts_rank(g."searchVector", plainto_tsquery('english', $1)) as rank
      FROM "Gist" g
      WHERE ${whereConditions} ${cursorCondition}
      ORDER BY rank DESC, "id" DESC
      LIMIT $${paramIndex + 1}
    `;

    params.push(pageSize + 1);

    const results = await this.prisma.$queryRawUnsafe<any>(sqlQuery, ...params);

    const gistIds = results.slice(0, pageSize).map((r: any) => r.id);

    const gists = gistIds.length > 0
      ? await this.prisma.gist.findMany({
          where: { id: { in: gistIds } },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            files: {
              orderBy: { order: 'asc' },
              take: 1,
            },
            tags: true,
          },
        })
      : [];

    const rankedGists = gistIds.map((id: string) =>
      gists.find((g: any) => g.id === id)
    ).filter(Boolean);

    let nextCursor: string | null = null;
    if (results.length > pageSize) {
      nextCursor = results[pageSize].id;
    }

    return {
      data: rankedGists,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  private async getGistRank(gistId: string, query: string): Promise<number | null> {
    const result = await this.prisma.$queryRawUnsafe<any>(
      `
      SELECT ts_rank("searchVector", plainto_tsquery('english', $2)) as rank
      FROM "Gist"
      WHERE id = $1
      `,
      gistId,
      query
    );

    if (Array.isArray(result) && result.length > 0) {
      return result[0].rank;
    }
    return null;
  }

  async getPopularTags() {
    const cached = await this.redis.get(this.POPULAR_GISTS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const tags = await this.prisma.tag.findMany({
      take: 20,
      orderBy: {
        gists: { _count: 'desc' },
      },
      include: {
        _count: {
          select: { gists: true },
        },
      },
    });

    const result = tags.map(tag => ({
      name: tag.name,
      count: tag._count.gists,
    }));

    await this.redis.setWithExpiry(
      this.POPULAR_GISTS_CACHE_KEY,
      JSON.stringify(result),
      this.CACHE_TTL,
    );

    return result;
  }

  async createGist(userId: string, dto: CreateGistDto) {
    const tags = dto.tags ? await this.upsertTags(dto.tags) : [];

    return this.prisma.$transaction(async (tx) => {
      const gist = await tx.gist.create({
        data: {
          title: dto.title,
          description: dto.description,
          visibility: dto.visibility || Visibility.PUBLIC,
          authorId: userId,
          tags: {
            connect: tags.map(tag => ({ id: tag.id })),
          },
        },
      });

      await tx.gistFile.createMany({
        data: dto.files.map((file, index) => ({
          filename: file.filename,
          language: file.language,
          content: file.content,
          order: index,
          gistId: gist.id,
        })),
      });

      const revision = await tx.revision.create({
        data: {
          gistId: gist.id,
          message: 'Initial revision',
        },
      });

      await tx.gistFile.createMany({
        data: dto.files.map((file, index) => ({
          filename: file.filename,
          language: file.language,
          content: file.content,
          order: index,
          gistId: gist.id,
          revisionId: revision.id,
        })),
      });

      return tx.gist.findUnique({
        where: { id: gist.id },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          files: {
            orderBy: { order: 'asc' },
          },
          tags: true,
          revisions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    });
  }

  async getGist(id: string, currentUserId?: string) {
    const gist = await this.prisma.gist.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        files: {
          orderBy: { order: 'asc' },
          where: { revisionId: null },
        },
        tags: true,
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            stars: true,
            forks: true,
          },
        },
      },
    });

    if (!gist) {
      throw new NotFoundException('Gist not found');
    }

    if (
      gist.visibility === Visibility.PRIVATE &&
      gist.author.id !== currentUserId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (gist.visibility === Visibility.UNLISTED && gist.author.id !== currentUserId) {
    }

    const isStarred = currentUserId
      ? !!(await this.prisma.star.findUnique({
          where: {
            userId_gistId: {
              userId: currentUserId,
              gistId: id,
            },
          },
        }))
      : false;

    return { ...gist, isStarred };
  }

  async updateGist(id: string, userId: string, dto: UpdateGistDto) {
    const gist = await this.prisma.gist.findUnique({
      where: { id },
      include: { files: { where: { revisionId: null } } },
    });

    if (!gist) {
      throw new NotFoundException('Gist not found');
    }

    if (gist.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const tags = dto.tags ? await this.upsertTags(dto.tags) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updatedGist = await tx.gist.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          visibility: dto.visibility,
          tags: tags
            ? {
                set: tags.map(tag => ({ id: tag.id })),
              }
            : undefined,
        },
      });

      if (dto.files) {
        await tx.gistFile.deleteMany({
          where: { gistId: id, revisionId: null },
        });

        await tx.gistFile.createMany({
          data: dto.files.map((file, index) => ({
            filename: file.filename,
            language: file.language,
            content: file.content,
            order: index,
            gistId: id,
          })),
        });

        const revision = await tx.revision.create({
          data: {
            gistId: id,
            message: dto.revisionMessage || 'Updated gist',
          },
        });

        await tx.gistFile.createMany({
          data: dto.files.map((file, index) => ({
            filename: file.filename,
            language: file.language,
            content: file.content,
            order: index,
            gistId: id,
            revisionId: revision.id,
          })),
        });
      }

      return tx.gist.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          files: {
            orderBy: { order: 'asc' },
            where: { revisionId: null },
          },
          tags: true,
        },
      });
    });
  }

  async deleteGist(id: string, userId: string) {
    const gist = await this.prisma.gist.findUnique({
      where: { id },
    });

    if (!gist) {
      throw new NotFoundException('Gist not found');
    }

    if (gist.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.gist.delete({
      where: { id },
    });

    return { message: 'Gist deleted successfully' };
  }

  async forkGist(id: string, userId: string) {
    const originalGist = await this.prisma.gist.findUnique({
      where: { id },
      include: {
        files: {
          where: { revisionId: null },
          orderBy: { order: 'asc' },
        },
        tags: true,
      },
    });

    if (!originalGist) {
      throw new NotFoundException('Gist not found');
    }

    if (
      originalGist.visibility === Visibility.PRIVATE &&
      originalGist.authorId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (originalGist.authorId === userId) {
      throw new ForbiddenException('Cannot fork your own gist');
    }

    return this.prisma.$transaction(async (tx) => {
      const forkedGist = await tx.gist.create({
        data: {
          title: originalGist.title,
          description: originalGist.description,
          visibility: Visibility.PRIVATE,
          authorId: userId,
          parentId: originalGist.id,
          tags: {
            connect: originalGist.tags.map(tag => ({ id: tag.id })),
          },
        },
      });

      await tx.gistFile.createMany({
        data: originalGist.files.map((file, index) => ({
          filename: file.filename,
          language: file.language,
          content: file.content,
          order: index,
          gistId: forkedGist.id,
        })),
      });

      const revision = await tx.revision.create({
        data: {
          gistId: forkedGist.id,
          message: 'Forked revision',
        },
      });

      await tx.gistFile.createMany({
        data: originalGist.files.map((file, index) => ({
          filename: file.filename,
          language: file.language,
          content: file.content,
          order: index,
          gistId: forkedGist.id,
          revisionId: revision.id,
        })),
      });

      await tx.gist.update({
        where: { id: originalGist.id },
        data: {
          forksCount: { increment: 1 },
        },
      });

      return tx.gist.findUnique({
        where: { id: forkedGist.id },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          files: {
            orderBy: { order: 'asc' },
            where: { revisionId: null },
          },
          tags: true,
          parent: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async starGist(id: string, userId: string) {
    const gist = await this.prisma.gist.findUnique({
      where: { id },
    });

    if (!gist) {
      throw new NotFoundException('Gist not found');
    }

    if (
      gist.visibility === Visibility.PRIVATE &&
      gist.authorId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const existingStar = await this.prisma.star.findUnique({
      where: {
        userId_gistId: {
          userId,
          gistId: id,
        },
      },
    });

    if (existingStar) {
      return { message: 'Already starred' };
    }

    await this.prisma.star.create({
      data: {
        userId,
        gistId: id,
      },
    });

    await this.updateGistStarsCount(id);

    if (gist.authorId !== userId) {
      await this.prisma.notification.create({
        data: {
          type: 'STAR',
          userId: gist.authorId,
          gistId: id,
          actorId: userId,
        },
      });
      await this.redis.incr(`notifications:count:${gist.authorId}`);
    }

    return { message: 'Starred successfully' };
  }

  async unstarGist(id: string, userId: string) {
    const existingStar = await this.prisma.star.findUnique({
      where: {
        userId_gistId: {
          userId,
          gistId: id,
        },
      },
    });

    if (!existingStar) {
      return { message: 'Not starred' };
    }

    await this.prisma.star.delete({
      where: {
        userId_gistId: {
          userId,
          gistId: id,
        },
      },
    });

    await this.updateGistStarsCount(id);

    return { message: 'Unstarred successfully' };
  }

  async getRevisions(id: string) {
    return this.prisma.revision.findMany({
      where: { gistId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        files: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async getRevision(id: string, revisionId: string, currentUserId?: string) {
    const gist = await this.prisma.gist.findUnique({
      where: { id },
    });

    if (!gist) {
      throw new NotFoundException('Gist not found');
    }

    if (
      gist.visibility === Visibility.PRIVATE &&
      gist.authorId !== currentUserId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      include: {
        files: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!revision || revision.gistId !== id) {
      throw new NotFoundException('Revision not found');
    }

    return revision;
  }

  async getDiff(
    gistId: string,
    fromRevisionId: string,
    toRevisionId: string,
    currentUserId?: string,
  ) {
    const gist = await this.prisma.gist.findUnique({
      where: { id: gistId },
    });

    if (!gist) {
      throw new NotFoundException('Gist not found');
    }

    if (
      gist.visibility === Visibility.PRIVATE &&
      gist.authorId !== currentUserId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const [fromRevision, toRevision] = await Promise.all([
      this.prisma.revision.findUnique({
        where: { id: fromRevisionId },
        include: { files: { orderBy: { order: 'asc' } } },
      }),
      this.prisma.revision.findUnique({
        where: { id: toRevisionId },
        include: { files: { orderBy: { order: 'asc' } } },
      }),
    ]);

    if (
      !fromRevision ||
      !toRevision ||
      fromRevision.gistId !== gistId ||
      toRevision.gistId !== gistId
    ) {
      throw new NotFoundException('Revision not found');
    }

    const fileDiffs: any[] = [];

    const fromFilesMap = new Map(
      fromRevision.files.map(f => [f.filename, f]),
    );
    const toFilesMap = new Map(
      toRevision.files.map(f => [f.filename, f]),
    );

    const allFilenames = new Set([
      ...fromFilesMap.keys(),
      ...toFilesMap.keys(),
    ]);

    for (const filename of allFilenames) {
      const fromFile = fromFilesMap.get(filename);
      const toFile = toFilesMap.get(filename);

      const diff = Diff.diffLines(
        fromFile?.content || '',
        toFile?.content || '',
      );

      fileDiffs.push({
        filename,
        fromLanguage: fromFile?.language,
        toLanguage: toFile?.language,
        changes: diff,
        added: !fromFile && !!toFile,
        deleted: !!fromFile && !toFile,
      });
    }

    return {
      from: fromRevision,
      to: toRevision,
      fileDiffs,
    };
  }

  private async upsertTags(tagNames: string[]) {
    const uniqueTags = [...new Set(tagNames.map(t => t.toLowerCase().trim()))].filter(Boolean);

    const tags = await Promise.all(
      uniqueTags.map(name =>
        this.prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    return tags;
  }
}
