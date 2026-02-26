import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsUUID,
  ArrayUnique,
} from 'class-validator';

export class CreatePostDraftFromIdeaDto {
  @IsOptional()
  @IsUUID()
  captionId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  assetIds?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;
}
