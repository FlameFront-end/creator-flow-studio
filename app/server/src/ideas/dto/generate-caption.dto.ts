import { IsBoolean, IsOptional } from 'class-validator';

export class GenerateCaptionDto {
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}
