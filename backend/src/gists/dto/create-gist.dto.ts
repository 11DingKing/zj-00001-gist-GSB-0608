import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Visibility } from '@prisma/client';
import { GistFileDto } from './gist-file.dto';

export class CreateGistDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GistFileDto)
  files: GistFileDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
