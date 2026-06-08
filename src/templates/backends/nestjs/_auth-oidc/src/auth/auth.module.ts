import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OidcJwksService } from './oidc-jwks.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [OidcJwksService, JwtStrategy],
  exports: [OidcJwksService],
})
export class AuthModule {}
