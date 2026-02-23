import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { PromptTemplateKey } from '../entities/prompt-template.entity';

export class CreatePromptTemplateDto {
  @IsEnum(PromptTemplateKey)
  key!: PromptTemplateKey;

  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  template!: string;
}
