import { IsEmail, IsString, IsEnum, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name;

  @IsEmail({}, { message: 'Invalid email address' })
  email;

  @IsString()
  @MinLength(6, { message: 'Password is too short. It must be at least 6 characters long.' })
  password;

  @IsOptional()
  @IsString()
  googleId;

  @IsOptional()
  @IsEnum(['user', 'admin'])
  role;

  @IsOptional()
  @IsEnum(['free', 'premium'])
  subscription;
}