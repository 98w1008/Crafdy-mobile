-- 現場情報拡張スキーマ
-- 既存のwork_sitesテーブルを拡張

-- 工事種別ENUM
CREATE TYPE work_type AS ENUM ('新築', '改築', '解体', 'インフラ', 'リフォーム', 'メンテナンス');
CREATE TYPE work_site_status AS ENUM ('planning', 'in_progress', 'completed', 'on_hold', 'cancelled');
CREATE TYPE progress_stage AS ENUM ('pre_construction', 'foundation', 'structure', 'finishing', 'completion');
CREATE TYPE attachment_type AS ENUM ('progress_photo', 'drawing', 'document', 'safety_report', 'inspection_photo');

-- 現場情報テーブル拡張
DROP TABLE IF EXISTS work_sites CASCADE;
CREATE TABLE IF NOT EXISTS public.work_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  postal_code TEXT,
  client_name TEXT,
  client_contact TEXT,
  client_email TEXT,
  project_type work_type NOT NULL DEFAULT '新築',
  construction_start DATE,
  construction_end DATE,
  manager_id UUID REFERENCES auth.users(id),
  status work_site_status DEFAULT 'planning',
  budget DECIMAL(12,2),
  notes TEXT,
  company_id UUID REFERENCES companies(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  safety_requirements TEXT,
  special_instructions TEXT,
  access_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 現場写真・資料
CREATE TABLE IF NOT EXISTS public.work_site_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_site_id UUID REFERENCES work_sites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type attachment_type NOT NULL DEFAULT 'progress_photo',
  progress_stage progress_stage,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 現場メモテーブル
CREATE TABLE IF NOT EXISTS public.work_site_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_site_id UUID REFERENCES work_sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- 'general', 'safety', 'technical', 'meeting'
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_work_sites_company ON work_sites(company_id);
CREATE INDEX idx_work_sites_status ON work_sites(status);
CREATE INDEX idx_work_sites_manager ON work_sites(manager_id);
CREATE INDEX idx_work_sites_construction_dates ON work_sites(construction_start, construction_end);
CREATE INDEX idx_work_site_attachments_site ON work_site_attachments(work_site_id);
CREATE INDEX idx_work_site_attachments_type ON work_site_attachments(file_type);
CREATE INDEX idx_work_site_attachments_stage ON work_site_attachments(progress_stage);
CREATE INDEX idx_work_site_notes_site ON work_site_notes(work_site_id);
CREATE INDEX idx_work_site_notes_user ON work_site_notes(user_id);

-- RLS有効化
ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_site_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_site_notes ENABLE ROW LEVEL SECURITY;

-- RLSポリシー - 現場情報
CREATE POLICY "Users can view company work sites" ON work_sites
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can create work sites" ON work_sites
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        ) AND created_by = auth.uid()
    );

CREATE POLICY "Users can update company work sites" ON work_sites
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

-- RLSポリシー - 添付ファイル
CREATE POLICY "Users can view work site attachments" ON work_site_attachments
    FOR SELECT USING (
        work_site_id IN (
            SELECT id FROM work_sites ws
            JOIN users u ON ws.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can upload work site attachments" ON work_site_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        work_site_id IN (
            SELECT id FROM work_sites ws
            JOIN users u ON ws.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

-- RLSポリシー - 現場メモ
CREATE POLICY "Users can view work site notes" ON work_site_notes
    FOR SELECT USING (
        work_site_id IN (
            SELECT id FROM work_sites ws
            JOIN users u ON ws.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can create work site notes" ON work_site_notes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        work_site_id IN (
            SELECT id FROM work_sites ws
            JOIN users u ON ws.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

-- 自動更新トリガー
CREATE TRIGGER trigger_work_sites_updated_at 
    BEFORE UPDATE ON work_sites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_work_site_notes_updated_at 
    BEFORE UPDATE ON work_site_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 現場統計ビュー
CREATE VIEW work_site_statistics AS
SELECT 
    ws.id,
    ws.name,
    ws.company_id,
    ws.status,
    ws.project_type,
    ws.construction_start,
    ws.construction_end,
    ws.budget,
    COUNT(DISTINCT wsa.id) FILTER (WHERE wsa.file_type = 'progress_photo') AS photo_count,
    COUNT(DISTINCT wsa.id) FILTER (WHERE wsa.file_type = 'document') AS document_count,
    COUNT(DISTINCT wsn.id) AS note_count,
    COUNT(DISTINCT r.id) AS report_count,
    COALESCE(AVG(r.progress_rate), 0) AS avg_progress_rate
FROM work_sites ws
LEFT JOIN work_site_attachments wsa ON ws.id = wsa.work_site_id
LEFT JOIN work_site_notes wsn ON ws.id = wsn.work_site_id
LEFT JOIN reports r ON ws.id = r.work_site_id
GROUP BY ws.id, ws.name, ws.company_id, ws.status, ws.project_type, 
         ws.construction_start, ws.construction_end, ws.budget;