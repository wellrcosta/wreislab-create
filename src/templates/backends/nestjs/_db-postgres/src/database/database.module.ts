import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST') ?? 'localhost',
        port: parseInt(config.get('POSTGRES_PORT') ?? '5432', 10),
        username: config.get('POSTGRES_USER') ?? 'app',
        password: config.get('POSTGRES_PASSWORD') ?? 'secret',
        database: config.get('POSTGRES_DB') ?? 'app',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        retryAttempts: 30,
        retryDelay: 3000,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
