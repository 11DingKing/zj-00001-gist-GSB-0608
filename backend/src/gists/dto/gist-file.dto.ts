import { IsString, IsNotEmpty } from 'class-validator';

export class GistFileDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  content: string;
}
