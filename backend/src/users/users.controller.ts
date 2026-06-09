import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@GetCurrentUserId() userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  @Public()
  @Get(':username')
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.getUserByUsername(username);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username/gists')
  async getUserGists(
    @Param('username') username: string,
    @GetCurrentUserId() currentUserId: string,
  ) {
    return this.usersService.getUserGists(username, currentUserId);
  }
}
