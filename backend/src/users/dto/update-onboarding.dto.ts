import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateOnboardingDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  preferredTeaTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  preferredFlavorTags?: string[];
}
