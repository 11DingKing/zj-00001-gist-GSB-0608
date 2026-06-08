import { Module } from '@nestjs/common';
import { GistsController } from './gists.controller';
import { GistsService } from './gists.service';

@Module({
  controllers: [GistsController],
  providers: [GistsService],
})
export class GistsModule {}
