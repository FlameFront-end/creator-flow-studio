import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PromptTemplateKey } from '../entities/prompt-template.entity';

export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsEnum(PromptTemplateKey)
  key?: PromptTemplateKey;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  template?: string;
}
