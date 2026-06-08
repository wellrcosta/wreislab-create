import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Groups } from '../common/decorators/groups.decorator';
import { Public } from '../common/decorators/public.decorator';
import { GroupsGuard } from '../common/guards/groups.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';

@ApiTags('example')
@Controller()
export class ExampleController {
  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public endpoint — no authentication required' })
  @ApiResponse({ status: 200 })
  getPublic(): { message: string; authenticated: boolean } {
    return { message: 'Public endpoint', authenticated: false };
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
  @UseGuards(GroupsGuard)
  @Groups('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Requires admin group' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Insufficient group membership' })
  getAdmin(): { message: string; allowed: boolean } {
    return { message: 'Admin endpoint', allowed: true };
  }
}
