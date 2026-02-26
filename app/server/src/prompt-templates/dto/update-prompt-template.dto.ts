import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PromptTemplateKey } from '../entities/prompt-template.entity';

export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsEnum(PromptTemplateKey)
  key?: PromptTemplateKey;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  template?: string;
}
