import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  validate(payload: Record<string, unknown>): AuthenticatedUser {
    return {
      sub: (payload['sub'] as string) ?? '',
      email: (payload['email'] as string) ?? '',
      name: (payload['name'] as string) ?? '',
      roles: Array.isArray(payload['roles']) ? (payload['roles'] as string[]) : [],
      iat: payload['iat'] as number | undefined,
      exp: payload['exp'] as number | undefined,
    };
  }
}
