import { IsOptional, IsUUID } from 'class-validator';

export class ListIdeasQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

