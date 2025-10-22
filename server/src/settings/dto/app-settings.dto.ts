import { IsInt, Min } from 'class-validator';

export class AppSettingsDto { @IsInt() @Min(0) stockAlertThreshold!: number; }

