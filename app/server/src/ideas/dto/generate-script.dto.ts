import { IsBoolean, IsOptional } from 'class-validator';

export class GenerateScriptDto {
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}
