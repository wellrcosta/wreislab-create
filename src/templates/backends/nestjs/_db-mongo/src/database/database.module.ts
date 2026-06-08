import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGO_URI') ?? 'mongodb://localhost:27017/app',
        serverSelectionTimeoutMS: 60000,
        connectTimeoutMS: 10000,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
