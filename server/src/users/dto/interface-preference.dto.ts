import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateInterfacePreferenceDto {
  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  sidebarStyle?: string;

  @IsOptional()
  @IsString()
  density?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  widgets?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  navigation?: Record<string, boolean>;
}
