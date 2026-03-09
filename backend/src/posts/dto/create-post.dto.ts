import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostCategory } from '../entities/post.entity';
import { PostImageItemDto } from './post-image-item.dto';

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
  isAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isSponsored?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  sponsorNote?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PostImageItemDto)
  images?: PostImageItemDto[];
}
