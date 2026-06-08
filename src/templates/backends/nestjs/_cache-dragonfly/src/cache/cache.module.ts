import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          new KeyvRedis(`redis://${config.get<string>('REDIS_HOST') ?? 'localhost'}:${config.get<number>('REDIS_PORT') ?? 6379}`),
        ],
        ttl: (config.get<number>('REDIS_TTL') ?? 300) * 1000,
      }),
    }),
  ],
})
export class AppCacheModule {}
