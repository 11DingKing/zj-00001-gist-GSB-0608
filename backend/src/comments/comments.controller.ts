import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateCommentDto } from './dto';
import { CursorPaginationDto } from '../gists/dto';

@ApiTags('Comments')
@Controller('gists/:gistId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get()
  async listComments(
    @Param('gistId') gistId: string,
    @Query() pagination: CursorPaginationDto,
    @GetCurrentUserId() currentUserId?: string
  ) {
    return this.commentsService.listComments(gistId, pagination, currentUserId);
  }

  @Post()
  async createComment(
    @Param('gistId') gistId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateCommentDto
  ) {
    return this.commentsService.createComment(gistId, userId, dto);
  }

  @Delete(':id')
  async deleteComment(
    @Param('gistId') gistId: string,
    @Param('id') id: string,
    @GetCurrentUserId() userId: string
  ) {
    return this.commentsService.deleteComment(gistId, id, userId);
  }
}
