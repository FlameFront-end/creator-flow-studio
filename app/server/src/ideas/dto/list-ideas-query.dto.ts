import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const DEFAULT_IDEAS_PAGE_LIMIT = 30;
export const MAX_IDEAS_PAGE_LIMIT = 100;

export class ListIdeasQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_IDEAS_PAGE_LIMIT)
  limit?: number;

  @IsOptional()
  @IsDateString()
  cursorCreatedAt?: string;

  @ValidateIf(
    (dto: { cursorCreatedAt?: string }) => dto.cursorCreatedAt !== undefined,
  )
  @IsUUID()
  cursorId?: string;
}
