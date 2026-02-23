import { IsBoolean, IsOptional } from 'class-validator';

export class GenerateImageDto {
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}
