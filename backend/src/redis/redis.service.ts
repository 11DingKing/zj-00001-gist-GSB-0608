import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async setWithExpiry(key: string, value: string, seconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', seconds);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hGet(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hDel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async hExists(key: string, field: string): Promise<number> {
    return this.client.hexists(key, field);
  }

  async zAdd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  async zRevRangeWithScores(key: string, start: number, stop: number): Promise<[string, string][]> {
    const result = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
    const pairs: [string, string][] = [];
    for (let i = 0; i < result.length; i += 2) {
      pairs.push([result[i], result[i + 1]]);
    }
    return pairs;
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
