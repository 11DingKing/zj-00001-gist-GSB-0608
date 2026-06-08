import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Visibility } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            gists: true,
            stars: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            gists: true,
            stars: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserGists(username: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { authorId: user.id };

    if (user.id !== currentUserId) {
      where.visibility = Visibility.PUBLIC;
    }

    return this.prisma.gist.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
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
  }
}
