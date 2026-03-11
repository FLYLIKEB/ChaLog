import { IsArray, ArrayMinSize, ArrayMaxSize, IsNumber } from 'class-validator';

export class CreateBlindSessionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsNumber({}, { each: true })
  teaIds: number[];
}
