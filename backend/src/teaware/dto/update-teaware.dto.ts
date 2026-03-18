import { PartialType } from '@nestjs/mapped-types';
import { CreateTeawareDto } from './create-teaware.dto';

export class UpdateTeawareDto extends PartialType(CreateTeawareDto) {}
