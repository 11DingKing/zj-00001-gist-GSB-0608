import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto, RegisterDto } from './dto';
import { Tokens } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<Tokens & { user: any }> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        displayName: dto.displayName || dto.username,
      },
    });

    const tokens = await this.getTokens(user.id, user.username);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async login(dto: LoginDto): Promise<Tokens & { user: any }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id, user.username);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async logout(userId: string): Promise<void> {
    const key = `refresh_tokens:${userId}`;
    await this.redis.del(key);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<Tokens & { user: any }> {
    const key = `refresh_tokens:${userId}`;
    const storedToken = await this.redis.hGet(key, refreshToken);

    if (!storedToken) {
      throw new ForbiddenException('Access denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    await this.redis.hDel(key, refreshToken);

    const tokens = await this.getTokens(user.id, user.username);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async getMe(userId: string) {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async getTokens(userId: string, username: string): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const key = `refresh_tokens:${userId}`;
    const ttl = 7 * 24 * 60 * 60;
    await this.redis.hSet(key, refreshToken, 'active');
    await this.redis.getClient().expire(key, ttl);
  }
}
