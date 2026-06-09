import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { CursorPaginationDto } from '../gists/dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(
    @GetCurrentUserId() userId: string,
    @Query() pagination: CursorPaginationDto,
    @Query('read') read?: string
  ) {
    const isRead = read === 'true' ? true : read === 'false' ? false : undefined;
    return this.notificationsService.listNotifications(userId, pagination, isRead);
  }

  @Get('unread-count')
  async getUnreadCount(@GetCurrentUserId() userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllAsRead(@GetCurrentUserId() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
