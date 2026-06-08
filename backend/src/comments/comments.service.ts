import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCommentDto } from './dto';
import { CursorPaginationDto } from '../gists/dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return [];
    return matches.map(match => match.slice(1));
  }

  async listComments(
    gistId: string,
    pagination: CursorPaginationDto,
    currentUserId?: string,
  ) {
    const gist = await this.prisma.gist.findUnique({
      where: { id: gistId },
      select: { visibility: true, authorId: true },
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

    const pageSize = pagination.limit || 20;
    const where: Prisma.CommentWhereInput = {
      gistId,
      parentId: null,
    };

    if (pagination.cursor) {
      const cursorComment = await this.prisma.comment.findUnique({
        where: { id: pagination.cursor },
        select: { createdAt: true },
      });
      if (cursorComment) {
        where.createdAt = { lt: cursorComment.createdAt };
      }
    }

    const comments = await this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (comments.length > pageSize) {
      const nextItem = comments.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: comments,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  async createComment(
    gistId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    const gist = await this.prisma.gist.findUnique({
      where: { id: gistId },
      select: { visibility: true, authorId: true },
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

    const mentionedUsernames = this.extractMentions(dto.content);
    const mentionedUsers = mentionedUsernames.length > 0
      ? await this.prisma.user.findMany({
          where: { username: { in: mentionedUsernames } },
        })
      : [];

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          content: dto.content,
          gistId,
          authorId: userId,
          parentId: dto.parentId,
          mentions: mentionedUsers.length > 0
            ? { connect: mentionedUsers.map(u => ({ id: u.id })) }
            : undefined,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (gist.authorId !== userId) {
        await tx.notification.create({
          data: {
            type: 'COMMENT',
            userId: gist.authorId,
            gistId,
            commentId: comment.id,
            actorId: userId,
          },
        });
        await this.redis.incr(`notifications:count:${gist.authorId}`);
      }

      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.id !== userId && mentionedUser.id !== gist.authorId) {
          await tx.notification.create({
            data: {
              type: 'MENTION',
              userId: mentionedUser.id,
              mentionedId: mentionedUser.id,
              gistId,
              commentId: comment.id,
              actorId: userId,
            },
          });
          await this.redis.incr(`notifications:count:${mentionedUser.id}`);
        }
      }

      return comment;
    });
  }

  async deleteComment(
    gistId: string,
    id: string,
    userId: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { authorId: true, gistId: true },
    });

    if (!comment || comment.gistId !== gistId) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comment deleted successfully' };
  }
}
