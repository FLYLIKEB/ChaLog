import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty({ message: '태그 이름을 입력해주세요.' })
  @MinLength(2, { message: '태그 이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50)
  name: string;
}
