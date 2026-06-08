import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { OidcJwksService } from './oidc-jwks.service';

interface UserInfoProfile {
  email: string;
  name: string;
  groups: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly groupsClaim: string;
  private readonly userInfoCache = new Map<
    string,
    UserInfoProfile & { expiresAt: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly oidcJwksService: OidcJwksService,
  ) {
    const issuer = configService.get<string>('oidc.issuerUrl') ?? '';
    const audience = configService.get<string>('oidc.audience') ?? '';

    let lazyProvider: ReturnType<typeof passportJwtSecret> | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secretOrKeyProvider = (request: any, rawJwtToken: any, done: any) => {
      if (!lazyProvider) {
        lazyProvider = passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
          jwksUri: oidcJwksService.getJwksUri(),
        });
      }
      (lazyProvider as (r: unknown, t: unknown, d: unknown) => void)(request, rawJwtToken, done);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: Record<string, any> = {
      secretOrKeyProvider,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer,
      algorithms: ['RS256'],
      passReqToCallback: true,
    };

    if (audience) {
      options['audience'] = audience;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(options as any);

    this.groupsClaim = configService.get<string>('oidc.groupsClaim') ?? 'groups';
  }

  async validate(
    req: { headers: { authorization?: string } },
    payload: Record<string, unknown>,
  ): Promise<AuthenticatedUser> {
    const sub = (payload['sub'] as string) ?? '';
    let email = (payload['email'] as string) ?? '';
    let name = (payload['name'] as string) ?? '';

    const rawGroups = payload[this.groupsClaim];
    let groups: string[] = Array.isArray(rawGroups)
      ? (rawGroups as string[])
      : rawGroups
        ? [rawGroups as string]
        : [];

    if (!email || !name || groups.length === 0) {
      const profile = await this.fetchProfileFromUserInfo(sub, req.headers.authorization ?? '');
      if (!email) email = profile.email;
      if (!name) name = profile.name;
      if (!groups.length) groups = profile.groups;
    }

    return {
      sub,
      email,
      name,
      groups,
      iat: payload['iat'] as number | undefined,
      exp: payload['exp'] as number | undefined,
    };
  }

  private async fetchProfileFromUserInfo(
    sub: string,
    authHeader: string,
  ): Promise<UserInfoProfile> {
    const empty: UserInfoProfile = { email: '', name: '', groups: [] };
    const userInfoEndpoint = this.oidcJwksService.getUserInfoEndpoint();
    if (!userInfoEndpoint || !authHeader) return empty;

    const now = Date.now();
    const cached = this.userInfoCache.get(sub);
    if (cached && cached.expiresAt > now) {
      return { email: cached.email, name: cached.name, groups: cached.groups };
    }

    try {
      const res = await fetch(userInfoEndpoint, {
        headers: { Authorization: authHeader },
      });
      if (!res.ok) {
        this.logger.warn(`UserInfo endpoint returned HTTP ${res.status} for sub=${sub}`);
        return empty;
      }
      const profile = (await res.json()) as Record<string, unknown>;

      const raw = profile[this.groupsClaim];
      const groups: string[] = Array.isArray(raw)
        ? (raw as string[])
        : typeof raw === 'string'
          ? [raw]
          : [];
      const email = (profile['email'] as string) ?? '';
      const name = (profile['name'] as string) ?? '';

      this.userInfoCache.set(sub, { email, name, groups, expiresAt: now + 5 * 60 * 1000 });
      return { email, name, groups };
    } catch (err) {
      this.logger.warn(`Failed to fetch userinfo for sub=${sub}: ${(err as Error).message}`);
      return empty;
    }
  }
}
