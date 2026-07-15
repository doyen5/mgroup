import { IsString, MinLength } from 'class-validator';

export class RequestPhoneOtpDto {
  @IsString()
  @MinLength(6)
  phone: string;
}
