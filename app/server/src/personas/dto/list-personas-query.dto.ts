import { IsOptional, IsUUID } from 'class-validator';

export class ListPersonasQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
