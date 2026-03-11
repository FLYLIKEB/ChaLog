import { IsString, MinLength } from 'class-validator';

export class FindEmailDto {
  @IsString()
  @MinLength(1, { message: '이름을 입력해주세요.' })
  name: string;
}
