import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @Length(3, 320)
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
