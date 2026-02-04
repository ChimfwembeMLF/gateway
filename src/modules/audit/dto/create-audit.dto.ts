export class CreateAuditDto {
  userId?: string;
  event: string;
  auditableType: string;
  auditableId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  url?: string;
  ipAddress?: string;
  userAgent?: string;
  tags?: string;
}
