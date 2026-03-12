import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  blogUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isProfilePublic?: boolean;
}
