/**
 * 監査ログシステムの型定義
 */

// 監査ログ対象エンティティタイプ
export type AuditEntityType = 
  | 'reports'
  | 'receipts' 
  | 'invoices'
  | 'projects'
  | 'users'
  | 'estimates';

// 監査ログアクションタイプ
export type AuditActionType = 
  | 'create'
  | 'update' 
  | 'delete'
  | 'view'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'export';

// 変更データの差分情報
export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
  type: 'added' | 'modified' | 'removed';
}

// メタデータ情報
export interface AuditMetadata {
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  app_version?: string;
  session_id?: string;
  [key: string]: unknown;
}

// 監査ログエントリ
export interface AuditLogEntry {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditActionType;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  timestamp: string;
  changes?: FieldChange[];
  metadata?: AuditMetadata;
  description?: string;
  created_at: string;
  updated_at: string;
}

// 監査ログフィルタ条件
export interface AuditLogFilter {
  entity_type?: AuditEntityType;
  entity_id?: string;
  action?: AuditActionType;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
  search_query?: string;
}

// ページネーション情報
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
}

// 監査ログ取得レスポンス
export interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: PaginationInfo;
}

// 差分表示のプロパティ
export interface DiffDisplayProps {
  before: unknown;
  after: unknown;
  fieldName: string;
  changeType: FieldChange['type'];
}

// タイムライン表示のプロパティ
export interface TimelineItemProps {
  log: AuditLogEntry;
  onViewDiff?: (log: AuditLogEntry) => void;
  showDetails?: boolean;
}

// フィルタリング用のオプション
export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

// 検索・フィルタリングのプロパティ
export interface AuditLogSearchProps {
  onFilterChange: (filter: AuditLogFilter) => void;
  currentFilter: AuditLogFilter;
  entityTypes: FilterOption[];
  actions: FilterOption[];
  isLoading?: boolean;
}

// 統計情報
export interface AuditLogStats {
  total_entries: number;
  unique_actors: number;
  most_common_action: AuditActionType;
  date_range: {
    earliest: string;
    latest: string;
  };
  entity_distribution: Record<AuditEntityType, number>;
}

// エクスポート用のフォーマット
export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportRequest {
  filter: AuditLogFilter;
  format: ExportFormat;
  include_details: boolean;
}

// リアルタイム更新用のイベントタイプ
export interface AuditLogRealtimeEvent {
  type: 'new_entry' | 'update_entry';
  entry: AuditLogEntry;
  timestamp: string;
}