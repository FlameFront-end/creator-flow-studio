import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PromptTemplateKey } from '../entities/prompt-template.entity';

export class CreatePromptTemplateDto {
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsEnum(PromptTemplateKey)
  key!: PromptTemplateKey;

  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  template!: string;
}
