import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @Length(1, 255)
  email: string;

  @IsString()
  @Length(8, 200)
  password: string;

  @IsString()
  @Length(1, 100)
  userName: string;
}
