/**
 * 現場情報関連の型定義
 */

export type WorkType = '新築' | '改築' | '解体' | 'インフラ' | 'リフォーム' | 'メンテナンス';

export type WorkSiteStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export type ProgressStage = 
  | 'pre_construction'   // 着工前
  | 'foundation'         // 基礎工事
  | 'structure'          // 構造工事
  | 'finishing'          // 仕上げ工事
  | 'completion';        // 完成

export type AttachmentType = 
  | 'progress_photo'     // 進捗写真
  | 'drawing'            // 図面
  | 'document'           // 書類
  | 'safety_report'      // 安全報告書
  | 'inspection_photo';  // 検査写真

export type NoteType = 'general' | 'safety' | 'technical' | 'meeting';

export interface WorkSite {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  postal_code?: string;
  client_name?: string;
  client_contact?: string;
  client_email?: string;
  project_type: WorkType;
  construction_start?: string; // ISO date string
  construction_end?: string;   // ISO date string
  manager_id?: string;
  status: WorkSiteStatus;
  budget?: number;
  notes?: string;
  company_id: string;
  created_by?: string;
  safety_requirements?: string;
  special_instructions?: string;
  access_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkSiteAttachment {
  id: string;
  work_site_id: string;
  file_name: string;
  file_url: string;
  file_type: AttachmentType;
  progress_stage?: ProgressStage;
  taken_at: string;
  uploaded_by?: string;
  description?: string;
  file_size?: number;
  mime_type?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface WorkSiteNote {
  id: string;
  work_site_id: string;
  user_id: string;
  content: string;
  note_type: NoteType;
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  postal_code?: string;
  accuracy?: number;
}

export interface WorkSiteFormData {
  name: string;
  address: string;
  client_name?: string;
  client_contact?: string;
  client_email?: string;
  project_type: WorkType;
  construction_start?: Date;
  construction_end?: Date;
  manager_id?: string;
  budget?: number;
  notes?: string;
  safety_requirements?: string;
  special_instructions?: string;
  access_instructions?: string;
  location?: LocationData;
}

export interface WorkSiteSearchFilters {
  status?: WorkSiteStatus[];
  project_type?: WorkType[];
  manager_id?: string;
  date_range?: {
    start?: Date;
    end?: Date;
  };
  search_query?: string;
}

export interface WorkSiteStatistics {
  id: string;
  name: string;
  company_id: string;
  status: WorkSiteStatus;
  project_type: WorkType;
  construction_start?: string;
  construction_end?: string;
  budget?: number;
  photo_count: number;
  document_count: number;
  note_count: number;
  report_count: number;
  avg_progress_rate: number;
}

export interface WorkSiteGalleryItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_type: AttachmentType;
  progress_stage?: ProgressStage;
  description?: string;
  taken_at: string;
  uploaded_by?: string;
}

// API Response types
export interface WorkSiteListResponse {
  data: WorkSite[];
  count: number;
  has_more: boolean;
}

export interface WorkSiteDetailResponse extends WorkSite {
  attachments: WorkSiteAttachment[];
  notes: WorkSiteNote[];
  statistics: WorkSiteStatistics;
}

// Form validation
export interface WorkSiteFormErrors {
  name?: string;
  address?: string;
  project_type?: string;
  construction_start?: string;
  construction_end?: string;
  client_name?: string;
  client_contact?: string;
  client_email?: string;
  budget?: string;
}

// Location picker
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface AddressSearchResult {
  address: string;
  latitude: number;
  longitude: number;
  postal_code?: string;
  place_id?: string;
  formatted_address?: string;
}

// Attachment upload
export interface AttachmentUploadData {
  work_site_id: string;
  file_type: AttachmentType;
  progress_stage?: ProgressStage;
  description?: string;
  files: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  }[];
}

export interface AttachmentUploadProgress {
  attachment_id: string;
  progress: number; // 0-1
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

// Constants
export const WORK_TYPE_OPTIONS: { label: string; value: WorkType }[] = [
  { label: '新築', value: '新築' },
  { label: '改築', value: '改築' },
  { label: '解体', value: '解体' },
  { label: 'インフラ', value: 'インフラ' },
  { label: 'リフォーム', value: 'リフォーム' },
  { label: 'メンテナンス', value: 'メンテナンス' }
];

export const WORK_SITE_STATUS_OPTIONS: { label: string; value: WorkSiteStatus }[] = [
  { label: '計画中', value: 'planning' },
  { label: '施工中', value: 'in_progress' },
  { label: '完了', value: 'completed' },
  { label: '中断', value: 'on_hold' },
  { label: 'キャンセル', value: 'cancelled' }
];

export const PROGRESS_STAGE_OPTIONS: { label: string; value: ProgressStage }[] = [
  { label: '着工前', value: 'pre_construction' },
  { label: '基礎工事', value: 'foundation' },
  { label: '構造工事', value: 'structure' },
  { label: '仕上げ工事', value: 'finishing' },
  { label: '完成', value: 'completion' }
];

export const ATTACHMENT_TYPE_OPTIONS: { label: string; value: AttachmentType }[] = [
  { label: '進捗写真', value: 'progress_photo' },
  { label: '図面', value: 'drawing' },
  { label: '書類', value: 'document' },
  { label: '安全報告書', value: 'safety_report' },
  { label: '検査写真', value: 'inspection_photo' }
];

export const NOTE_TYPE_OPTIONS: { label: string; value: NoteType }[] = [
  { label: '一般', value: 'general' },
  { label: '安全', value: 'safety' },
  { label: '技術', value: 'technical' },
  { label: '会議', value: 'meeting' }
];