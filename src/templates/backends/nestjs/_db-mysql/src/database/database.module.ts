import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('MYSQL_HOST') ?? 'localhost',
        port: parseInt(config.get('MYSQL_PORT') ?? '3306', 10),
        username: config.get('MYSQL_USER') ?? 'app',
        password: config.get('MYSQL_PASSWORD') ?? 'secret',
        database: config.get('MYSQL_DATABASE') ?? 'app',
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
