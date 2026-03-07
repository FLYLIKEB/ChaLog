import { IsString, IsEnum, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';
import { PostCategory } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsEnum(PostCategory)
  category: PostCategory;

  @IsBoolean()
  @IsOptional()
  isSponsored?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  sponsorNote?: string;
}
