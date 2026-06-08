import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OidcJwksService implements OnModuleInit {
  private readonly logger = new Logger(OidcJwksService.name);
  private jwksUri = '';
  private userInfoEndpoint = '';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const configured = this.configService.get<string>('oidc.jwksUri') ?? '';
    const issuerUrl = (this.configService.get<string>('oidc.issuerUrl') ?? '').replace(/\/$/, '');

    if (configured) {
      this.jwksUri = configured;
      this.userInfoEndpoint = `${issuerUrl}/api/oidc/userinfo`;
      this.logger.log(`JWKS URI set from config: ${this.jwksUri}`);
      this.logger.log(`UserInfo endpoint: ${this.userInfoEndpoint}`);
      return;
    }

    const discoveryUrl = `${issuerUrl}/.well-known/openid-configuration`;
    this.logger.log(`Discovering OIDC endpoints from: ${discoveryUrl}`);

    try {
      const res = await fetch(discoveryUrl);
      if (!res.ok) {
        throw new Error(`Discovery endpoint returned HTTP ${res.status}`);
      }
      const doc = (await res.json()) as { jwks_uri?: string; userinfo_endpoint?: string };

      if (!doc.jwks_uri) {
        throw new Error('openid-configuration did not include jwks_uri');
      }
      this.jwksUri = doc.jwks_uri;
      this.userInfoEndpoint = doc.userinfo_endpoint ?? `${issuerUrl}/api/oidc/userinfo`;

      this.logger.log(`JWKS URI discovered: ${this.jwksUri}`);
      this.logger.log(`UserInfo endpoint: ${this.userInfoEndpoint}`);
    } catch (err) {
      throw new Error(
        `Failed to discover OIDC endpoints from ${discoveryUrl}: ${(err as Error).message}. ` +
          `Set OIDC_JWKS_URI explicitly in your .env to skip discovery.`,
      );
    }
  }

  getJwksUri(): string {
    return this.jwksUri;
  }

  getUserInfoEndpoint(): string {
    return this.userInfoEndpoint;
  }
}
