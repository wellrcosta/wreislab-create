import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';

export interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    // Replace this with real user lookup from your database
    if (dto.email !== 'admin@example.com' || dto.password !== 'changeme') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: Omit<AuthenticatedUser, 'iat' | 'exp'> = {
      sub: '1',
      email: dto.email,
      name: 'Admin User',
      roles: ['admin'],
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
