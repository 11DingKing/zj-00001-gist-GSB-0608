import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CursorPaginationDto } from '../gists/dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listNotifications(
    userId: string,
    pagination: CursorPaginationDto,
    isRead?: boolean,
  ) {
    const pageSize = pagination.limit || 20;
    const where: Prisma.NotificationWhereInput = { userId };

    if (isRead !== undefined) {
      where.read = isRead;
    }

    if (pagination.cursor) {
      const cursorNotification = await this.prisma.notification.findUnique({
        where: { id: pagination.cursor },
        select: { createdAt: true },
      });
      if (cursorNotification) {
        where.createdAt = { lt: cursorNotification.createdAt };
      }
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        mentioned: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (notifications.length > pageSize) {
      const nextItem = notifications.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: notifications,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  async getUnreadCount(userId: string) {
    const cachedCount = await this.redis.get(`notifications:count:${userId}`);
    if (cachedCount !== null) {
      return { count: parseInt(cachedCount, 10) };
    }

    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    await this.redis.set(`notifications:count:${userId}`, count.toString());
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { userId: true, read: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (notification.read) {
      return { message: 'Already marked as read' };
    }

    await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    const count = await this.redis.get(`notifications:count:${userId}`);
    if (count && parseInt(count, 10) > 0) {
      await this.redis.decr(`notifications:count:${userId}`);
    }

    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    await this.redis.set(`notifications:count:${userId}`, '0');

    return { message: `Marked ${result.count} notifications as read` };
  }
}
