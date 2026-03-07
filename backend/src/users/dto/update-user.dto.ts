import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

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
  @ValidateIf((o) => o.instagramUrl != null)
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  instagramUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.blogUrl != null)
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  blogUrl?: string | null;
}
