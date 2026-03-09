import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty({ message: '태그 이름을 입력해주세요.' })
  @MaxLength(50)
  name: string;
}
