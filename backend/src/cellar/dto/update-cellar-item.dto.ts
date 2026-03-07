import { PartialType } from '@nestjs/mapped-types';
import { CreateCellarItemDto } from './create-cellar-item.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdateCellarItemDto extends PartialType(OmitType(CreateCellarItemDto, ['teaId'] as const)) {}
