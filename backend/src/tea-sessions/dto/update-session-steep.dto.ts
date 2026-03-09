import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionSteepDto } from './create-session-steep.dto';

export class UpdateSessionSteepDto extends PartialType(CreateSessionSteepDto) {}
