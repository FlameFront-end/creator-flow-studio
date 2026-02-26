import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Length(16, 512)
  refreshToken!: string;
}
