import { IsNumber } from 'class-validator';

export class CreateBlindSessionDto {
  @IsNumber()
  teaId: number;
}
