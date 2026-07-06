export interface AuditLogResponse {
  id: string;
  actorUserId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
}

export interface PagedApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
