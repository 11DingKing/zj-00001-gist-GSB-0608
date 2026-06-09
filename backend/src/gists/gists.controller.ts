import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GistsService } from './gists.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateGistDto, UpdateGistDto, CursorPaginationDto, SearchGistsDto } from './dto';

@ApiTags('Gists')
@Controller('gists')
export class GistsController {
  constructor(private readonly gistsService: GistsService) {}

  @Public()
  @Get()
  async listGists(
    @Query() pagination: CursorPaginationDto,
    @Query('language') language?: string,
    @GetCurrentUserId() currentUserId?: string
  ) {
    return this.gistsService.listPublicGists(pagination, language, currentUserId);
  }

  @Public()
  @Get('search')
  async searchGists(
    @Query() searchDto: SearchGistsDto,
    @GetCurrentUserId() currentUserId?: string
  ) {
    return this.gistsService.searchGists(searchDto, currentUserId);
  }

  @Public()
  @Get('tags/popular')
  async getPopularTags() {
    return this.gistsService.getPopularTags();
  }

  @Post()
  async createGist(@GetCurrentUserId() userId: string, @Body() dto: CreateGistDto) {
    return this.gistsService.createGist(userId, dto);
  }

  @Public()
  @Get(':id')
  async getGist(@Param('id') id: string, @GetCurrentUserId() currentUserId?: string) {
    return this.gistsService.getGist(id, currentUserId);
  }

  @Put(':id')
  async updateGist(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateGistDto
  ) {
    return this.gistsService.updateGist(id, userId, dto);
  }

  @Delete(':id')
  async deleteGist(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.gistsService.deleteGist(id, userId);
  }

  @Post(':id/fork')
  async forkGist(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.gistsService.forkGist(id, userId);
  }

  @Post(':id/star')
  async starGist(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.gistsService.starGist(id, userId);
  }

  @Delete(':id/star')
  async unstarGist(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.gistsService.unstarGist(id, userId);
  }

  @Public()
  @Get(':id/revisions')
  async getRevisions(@Param('id') id: string) {
    return this.gistsService.getRevisions(id);
  }

  @Public()
  @Get(':id/revisions/:revisionId')
  async getRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @GetCurrentUserId() currentUserId?: string
  ) {
    return this.gistsService.getRevision(id, revisionId, currentUserId);
  }

  @Public()
  @Get(':id/diff')
  async getDiff(
    @Param('id') id: string,
    @Query('from') fromRevisionId: string,
    @Query('to') toRevisionId: string,
    @GetCurrentUserId() currentUserId?: string
  ) {
    return this.gistsService.getDiff(id, fromRevisionId, toRevisionId, currentUserId);
  }
}
