import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns the authenticated user profile from the JWT' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stateless logout acknowledgement' })
  @ApiResponse({ status: 200, description: 'Logout instruction' })
  logout(): { message: string } {
    return {
      message:
        'Backend is stateless. Logout is handled by the frontend and OIDC provider. ' +
        'Clear the local session and call the OIDC end_session_endpoint.',
    };
  }
}
