import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class JoinBlindSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  inviteCode: string;
}
