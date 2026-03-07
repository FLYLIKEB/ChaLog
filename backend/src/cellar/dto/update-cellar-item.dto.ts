import { PartialType } from '@nestjs/mapped-types';
import { CreateCellarItemDto } from './create-cellar-item.dto';

export class UpdateCellarItemDto extends PartialType(CreateCellarItemDto) {}
