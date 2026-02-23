import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { PromptTemplateKey } from '../../prompt-templates/entities/prompt-template.entity';

export class PromptPreviewDto {
  @IsUUID()
  personaId!: string;

  @IsEnum(PromptTemplateKey)
  templateKey!: PromptTemplateKey;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean>;
}
