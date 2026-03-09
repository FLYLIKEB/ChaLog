import { IsNumber } from 'class-validator';

export class CreateTeaSessionDto {
  @IsNumber()
  teaId: number;
}
