import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GistsModule } from './gists/gists.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { ttl: 60, limit: 100 },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    GistsModule,
    CommentsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
