import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';

@ApiTags('example')
@Controller()
export class ExampleController {
  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public endpoint — no authentication required' })
  @ApiResponse({ status: 200 })
  getPublic(): { message: string } {
    return { message: 'Public endpoint — no token needed' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected endpoint — returns authenticated user' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  getMe(@CurrentUser() user: AuthenticatedUser): { message: string; user: AuthenticatedUser } {
    return { message: 'Authenticated endpoint', user };
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Requires admin role' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  getAdmin(): { message: string } {
    return { message: 'Admin only endpoint' };
  }
}
