/**
 * 監査ログAPI - Supabaseとの統合
 */

import { supabase } from './supabase';
import {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogResponse,
  AuditLogStats,
  AuditEntityType,
  AuditActionType,
  FieldChange,
  AuditMetadata,
  ExportRequest,
  ExportFormat,
  PaginationInfo
} from '../types/audit-log';

/**
 * 監査ログを取得する
 */
export const getAuditLogs = async (
  filter: AuditLogFilter = {},
  page: number = 1,
  limit: number = 20
): Promise<AuditLogResponse> => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false });

    // フィルタリング条件の適用
    if (filter.entity_type) {
      query = query.eq('entity_type', filter.entity_type);
    }
    
    if (filter.entity_id) {
      query = query.eq('entity_id', filter.entity_id);
    }
    
    if (filter.action) {
      query = query.eq('action', filter.action);
    }
    
    if (filter.actor_id) {
      query = query.eq('actor_id', filter.actor_id);
    }
    
    if (filter.date_from) {
      query = query.gte('timestamp', filter.date_from);
    }
    
    if (filter.date_to) {
      query = query.lte('timestamp', filter.date_to);
    }
    
    if (filter.search_query) {
      query = query.or(`description.ilike.%${filter.search_query}%,actor_name.ilike.%${filter.search_query}%`);
    }

    // ページネーション
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('監査ログ取得エラー:', error);
      throw error;
    }

    const total = count || 0;
    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      has_next: from + limit < total,
      has_prev: page > 1
    };

    return {
      logs: data as AuditLogEntry[],
      pagination
    };
  } catch (error) {
    console.error('監査ログAPI呼び出しエラー:', error);
    throw error;
  }
};

/**
 * 特定エンティティの監査ログを取得する
 */
export const getEntityAuditLogs = async (
  entityType: AuditEntityType,
  entityId: string,
  page: number = 1,
  limit: number = 50
): Promise<AuditLogResponse> => {
  return getAuditLogs(
    { entity_type: entityType, entity_id: entityId },
    page,
    limit
  );
};

/**
 * 監査ログエントリを作成する（内部用）
 */
export const createAuditLogEntry = async (
  entityType: AuditEntityType,
  entityId: string,
  action: AuditActionType,
  changes?: FieldChange[],
  description?: string,
  metadata?: AuditMetadata
): Promise<AuditLogEntry> => {
  try {
    // 現在のユーザー情報を取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('ユーザー認証が必要です');
    }

    // ユーザープロファイルを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('プロファイル取得エラー:', profileError);
    }

    const auditEntry = {
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      actor_id: user.id,
      actor_name: profile?.full_name || user.email || 'Unknown User',
      actor_email: profile?.email || user.email,
      timestamp: new Date().toISOString(),
      changes: changes || [],
      metadata: {
        app_version: '1.0.0', // 実際のアプリバージョンに置き換え
        user_agent: 'Crafdy Mobile App',
        ...metadata
      },
      description
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditEntry)
      .select()
      .single();

    if (error) {
      console.error('監査ログ作成エラー:', error);
      throw error;
    }

    return data as AuditLogEntry;
  } catch (error) {
    console.error('監査ログ作成API呼び出しエラー:', error);
    throw error;
  }
};

/**
 * 変更内容の差分を計算する
 */
export const calculateFieldChanges = (
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>
): FieldChange[] => {
  const changes: FieldChange[] = [];
  const allFields = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);

  for (const field of allFields) {
    const before = beforeData[field];
    const after = afterData[field];

    if (!(field in beforeData)) {
      // フィールドが追加された
      changes.push({
        field,
        before: undefined,
        after,
        type: 'added'
      });
    } else if (!(field in afterData)) {
      // フィールドが削除された
      changes.push({
        field,
        before,
        after: undefined,
        type: 'removed'
      });
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      // フィールドが変更された
      changes.push({
        field,
        before,
        after,
        type: 'modified'
      });
    }
  }

  return changes;
};

/**
 * 監査ログ統計情報を取得する
 */
export const getAuditLogStats = async (
  filter: AuditLogFilter = {}
): Promise<AuditLogStats> => {
  try {
    let baseQuery = supabase.from('audit_logs').select('*');

    // フィルタリング条件の適用
    if (filter.entity_type) {
      baseQuery = baseQuery.eq('entity_type', filter.entity_type);
    }
    if (filter.date_from) {
      baseQuery = baseQuery.gte('timestamp', filter.date_from);
    }
    if (filter.date_to) {
      baseQuery = baseQuery.lte('timestamp', filter.date_to);
    }

    const { data, error } = await baseQuery;

    if (error) {
      throw error;
    }

    const logs = data as AuditLogEntry[];

    // 統計情報の計算
    const uniqueActors = new Set(logs.map(log => log.actor_id)).size;
    
    const actionCounts: Record<AuditActionType, number> = {} as any;
    const entityCounts: Record<AuditEntityType, number> = {} as any;

    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      entityCounts[log.entity_type] = (entityCounts[log.entity_type] || 0) + 1;
    });

    const mostCommonAction = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as AuditActionType || 'view';

    const timestamps = logs.map(log => log.timestamp).sort();

    return {
      total_entries: logs.length,
      unique_actors: uniqueActors,
      most_common_action: mostCommonAction,
      date_range: {
        earliest: timestamps[0] || new Date().toISOString(),
        latest: timestamps[timestamps.length - 1] || new Date().toISOString()
      },
      entity_distribution: entityCounts
    };
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    throw error;
  }
};

/**
 * 監査ログをエクスポートする
 */
export const exportAuditLogs = async (
  request: ExportRequest
): Promise<string> => {
  try {
    const { logs } = await getAuditLogs(request.filter, 1, 10000); // 大量データ取得

    switch (request.format) {
      case 'csv':
        return exportToCSV(logs, request.include_details);
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'pdf':
        // PDF生成は別途実装が必要
        throw new Error('PDF エクスポートは未実装です');
      default:
        throw new Error(`不明なエクスポート形式: ${request.format}`);
    }
  } catch (error) {
    console.error('エクスポートエラー:', error);
    throw error;
  }
};

/**
 * CSV形式でエクスポート
 */
const exportToCSV = (logs: AuditLogEntry[], includeDetails: boolean): string => {
  const headers = [
    'ID',
    'エンティティタイプ',
    'エンティティID',
    'アクション',
    '実行者',
    'メール',
    '実行日時',
    '説明'
  ];

  if (includeDetails) {
    headers.push('変更内容');
  }

  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.id,
      log.entity_type,
      log.entity_id,
      log.action,
      log.actor_name,
      log.actor_email || '',
      log.timestamp,
      (log.description || '').replace(/,/g, '；') // カンマをセミコロンに置換
    ];

    if (includeDetails && log.changes) {
      const changesSummary = log.changes
        .map(change => `${change.field}: ${change.type}`)
        .join('；');
      row.push(changesSummary);
    }

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

/**
 * リアルタイム監査ログ監視を開始
 */
export const subscribeToAuditLogs = (
  filter: AuditLogFilter,
  callback: (log: AuditLogEntry) => void
) => {
  let channel = supabase
    .channel('audit_logs_realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs',
        filter: filter.entity_type ? `entity_type=eq.${filter.entity_type}` : undefined
      },
      (payload) => {
        callback(payload.new as AuditLogEntry);
      }
    );

  if (filter.entity_id) {
    channel = channel.filter(`entity_id=eq.${filter.entity_id}`);
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * よく使用されるアクションのヘルパー関数
 */
export const auditHelpers = {
  // レポート関連
  logReportCreated: (reportId: string, description?: string) =>
    createAuditLogEntry('reports', reportId, 'create', [], description),
  
  logReportUpdated: (reportId: string, changes: FieldChange[], description?: string) =>
    createAuditLogEntry('reports', reportId, 'update', changes, description),
  
  logReportDeleted: (reportId: string, description?: string) =>
    createAuditLogEntry('reports', reportId, 'delete', [], description),

  // 請求書関連  
  logInvoiceCreated: (invoiceId: string, description?: string) =>
    createAuditLogEntry('invoices', invoiceId, 'create', [], description),
  
  logInvoiceUpdated: (invoiceId: string, changes: FieldChange[], description?: string) =>
    createAuditLogEntry('invoices', invoiceId, 'update', changes, description),

  // レシート関連
  logReceiptCreated: (receiptId: string, description?: string) =>
    createAuditLogEntry('receipts', receiptId, 'create', [], description),
  
  logReceiptUpdated: (receiptId: string, changes: FieldChange[], description?: string) =>
    createAuditLogEntry('receipts', receiptId, 'update', changes, description),

  // 承認関連
  logApprovalAction: (entityType: AuditEntityType, entityId: string, action: 'approve' | 'reject', description?: string) =>
    createAuditLogEntry(entityType, entityId, action, [], description)
};