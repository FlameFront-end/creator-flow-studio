import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AI_MAX_MAX_TOKENS,
  AI_MIN_MAX_TOKENS,
  AI_PROVIDER_VALUES,
} from '../ai-settings.types';

export class UpdateAiSettingsDto {
  @IsIn(AI_PROVIDER_VALUES)
  provider!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  model!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  responseLanguage?: string;

  @IsOptional()
  @IsInt()
  @Min(AI_MIN_MAX_TOKENS)
  @Max(AI_MAX_MAX_TOKENS)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  aiTestMode?: boolean;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  clearApiKey?: boolean;
}
