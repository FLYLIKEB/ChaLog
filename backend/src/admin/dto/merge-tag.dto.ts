import { IsNumber } from 'class-validator';

export class MergeTagDto {
  @IsNumber()
  targetTagId: number;
}
