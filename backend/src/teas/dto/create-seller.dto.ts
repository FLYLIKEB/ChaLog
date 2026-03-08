import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateSellerDto {
  @IsString()
  @IsNotEmpty({ message: '찻집 이름을 입력해주세요.' })
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mapUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessHours?: string;
}
