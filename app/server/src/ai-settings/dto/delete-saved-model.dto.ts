import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { AI_PROVIDER_VALUES } from '../ai-settings.types';

export class DeleteSavedModelDto {
  @IsIn(AI_PROVIDER_VALUES)
  provider!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  model!: string;
}
