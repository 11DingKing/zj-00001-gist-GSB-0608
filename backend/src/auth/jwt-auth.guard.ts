import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // For public routes we still run the passport pipeline so that, when an
    // Authorization header is present, request.user gets populated. Auth
    // failures on public routes are tolerated (see handleRequest below).
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, _info: any, context: ExecutionContext): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Anonymous access is allowed; ignore errors and missing users so
      // request.user is simply undefined when no/invalid token is provided.
      return user as TUser;
    }

    return super.handleRequest(err, user, _info, context);
  }
}
