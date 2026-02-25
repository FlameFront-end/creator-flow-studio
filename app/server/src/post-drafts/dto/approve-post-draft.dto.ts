import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApprovePostDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  overrideReason?: string;
}

