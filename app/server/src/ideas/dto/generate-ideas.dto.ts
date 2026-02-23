import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IdeaFormat } from '../entities/idea.entity';

export class GenerateIdeasDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  personaId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(280)
  topic!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsEnum(IdeaFormat)
  format?: IdeaFormat;
}
