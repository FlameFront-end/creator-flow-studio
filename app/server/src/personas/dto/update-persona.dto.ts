import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePersonaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(130)
  age?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  archetypeTone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  visualCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  voiceCode?: string;
}
