import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class UuidGeneratorService {
  generate(): string {
    return randomUUID();
  }
}
