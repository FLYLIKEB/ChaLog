import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class PostImageItemDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
