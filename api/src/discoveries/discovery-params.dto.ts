import { Matches } from 'class-validator';

export class DiscoveryParamsDto {
  @Matches(/^\d+$/)
  id: string;
}
