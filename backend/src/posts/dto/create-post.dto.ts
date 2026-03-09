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
import { Type, Transform } from 'class-transformer';
import { PostCategory } from '../entities/post.entity';
import { PostImageItemDto } from './post-image-item.dto';

const toBoolean = (v: unknown) => {
  if (v === true || v === false) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
};

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

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
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
