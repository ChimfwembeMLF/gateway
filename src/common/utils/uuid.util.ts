import { randomUUID } from 'crypto';

export function ensureUuid(id?: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return id && uuidRegex.test(id) ? id : randomUUID();
}
