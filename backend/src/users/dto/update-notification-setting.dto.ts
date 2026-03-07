import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingDto {
  @IsOptional()
  @IsBoolean()
  isNotificationEnabled?: boolean;
}
