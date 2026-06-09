import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUserId = createParamDecorator(
  (_data: undefined, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest();
    return request.user?.userId;
  }
);
