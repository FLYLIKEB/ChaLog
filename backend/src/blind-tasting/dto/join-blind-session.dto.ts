import { IsString } from 'class-validator';

export class JoinBlindSessionDto {
  @IsString()
  inviteCode: string;
}
