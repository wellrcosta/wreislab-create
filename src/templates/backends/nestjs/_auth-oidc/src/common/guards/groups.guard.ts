import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GROUPS_KEY } from '../decorators/groups.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class GroupsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredGroups = this.reflector.getAllAndOverride<string[]>(GROUPS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredGroups || requiredGroups.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasGroup = requiredGroups.some((group) => user.groups.includes(group));

    if (!hasGroup) {
      throw new ForbiddenException(
        `Access denied. Required groups: ${requiredGroups.join(', ')}. ` +
          `User groups: ${user.groups.join(', ') || 'none'}`,
      );
    }

    return true;
  }
}
