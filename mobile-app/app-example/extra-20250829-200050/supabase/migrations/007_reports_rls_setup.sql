-- 日報システムのRLS設定
-- Row Level Securityでアクセス制御を実装

-- =============================================================================
-- RLS有効化
-- =============================================================================

-- RLSを有効化
ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- work_sites テーブルのRLSポリシー
-- =============================================================================

-- 現場の参照権限（同じ会社のユーザーのみ）
CREATE POLICY "Users can view work sites in their company"
ON work_sites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = work_sites.company_id
  )
);

-- 現場の作成権限（管理者のみ）
CREATE POLICY "Admins can create work sites"
ON work_sites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = work_sites.company_id
    AND users.role IN ('admin', 'manager')
  )
);

-- 現場の更新権限（管理者のみ）
CREATE POLICY "Admins can update work sites"
ON work_sites FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = work_sites.company_id
    AND users.role IN ('admin', 'manager')
  )
);

-- 現場の削除権限（管理者のみ）
CREATE POLICY "Admins can delete work sites"
ON work_sites FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = work_sites.company_id
    AND users.role IN ('admin', 'manager')
  )
);

-- =============================================================================
-- reports テーブルのRLSポリシー
-- =============================================================================

-- 日報の参照権限
-- 1. 自分の日報は常に参照可能
-- 2. 管理者は同じ会社の全日報を参照可能
CREATE POLICY "Users can view their own reports or admins can view company reports"
ON reports FOR SELECT
USING (
  reports.user_id = auth.uid()  -- 自分の日報
  OR 
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM users report_user
      WHERE report_user.id = reports.user_id
      AND report_user.company_id = users.company_id
    )
  )
);

-- 日報の作成権限（認証済みユーザーのみ）
CREATE POLICY "Authenticated users can create reports"
ON reports FOR INSERT
WITH CHECK (
  auth.uid() = reports.user_id
  AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
  )
);

-- 日報の更新権限
-- 1. 自分の日報で、draft または rejected 状態の場合のみ更新可能
-- 2. 管理者は承認・差戻し操作のみ可能
CREATE POLICY "Users can update their own draft/rejected reports or admins can approve/reject"
ON reports FOR UPDATE
USING (
  -- 自分の日報で下書きまたは差戻し状態
  (
    reports.user_id = auth.uid()
    AND reports.status IN ('draft', 'rejected')
  )
  OR
  -- 管理者による承認・差戻し操作
  (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
      AND EXISTS (
        SELECT 1 FROM users report_user
        WHERE report_user.id = reports.user_id
        AND report_user.company_id = users.company_id
      )
    )
    AND reports.status = 'submitted'
  )
);

-- 日報の削除権限（管理者のみ）
CREATE POLICY "Admins can delete reports"
ON reports FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM users report_user
      WHERE report_user.id = reports.user_id
      AND report_user.company_id = users.company_id
    )
  )
);

-- =============================================================================
-- report_attachments テーブルのRLSポリシー
-- =============================================================================

-- 添付ファイルの参照権限（日報の参照権限と同じ）
CREATE POLICY "Users can view attachments of accessible reports"
ON report_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE reports.id = report_attachments.report_id
    AND (
      reports.user_id = auth.uid()
      OR 
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'manager')
        AND EXISTS (
          SELECT 1 FROM users report_user
          WHERE report_user.id = reports.user_id
          AND report_user.company_id = users.company_id
        )
      )
    )
  )
);

-- 添付ファイルの作成権限（対応する日報の所有者のみ）
CREATE POLICY "Users can create attachments for their own reports"
ON report_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reports
    WHERE reports.id = report_attachments.report_id
    AND reports.user_id = auth.uid()
  )
);

-- 添付ファイルの更新権限（対応する日報の所有者のみ、編集可能な状態のみ）
CREATE POLICY "Users can update attachments for their editable reports"
ON report_attachments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE reports.id = report_attachments.report_id
    AND reports.user_id = auth.uid()
    AND reports.status IN ('draft', 'rejected')
  )
);

-- 添付ファイルの削除権限（対応する日報の所有者または管理者）
CREATE POLICY "Users can delete attachments for their own reports or admins can delete any"
ON report_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE reports.id = report_attachments.report_id
    AND (
      reports.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'manager')
        AND EXISTS (
          SELECT 1 FROM users report_user
          WHERE report_user.id = reports.user_id
          AND report_user.company_id = users.company_id
        )
      )
    )
  )
);

-- =============================================================================
-- 関数とトリガー
-- =============================================================================

-- 日報更新時のtimestamp更新
CREATE OR REPLACE FUNCTION update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- 提出時のタイムスタンプ設定
  IF OLD.status != 'submitted' AND NEW.status = 'submitted' THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- 承認時のタイムスタンプ設定
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    NEW.approved_at = NOW();
    NEW.approved_by = auth.uid();
  END IF;
  
  -- 差戻し時の設定
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    NEW.approved_by = auth.uid();
    NEW.approved_at = NULL;
  END IF;
  
  -- 下書きに戻す時の設定
  IF NEW.status = 'draft' THEN
    NEW.submitted_at = NULL;
    NEW.approved_at = NULL;
    NEW.approved_by = NULL;
    NEW.rejection_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_update_report_timestamp ON reports;
CREATE TRIGGER trigger_update_report_timestamp
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_timestamp();

-- =============================================================================
-- 現場データのサンプル挿入（開発・テスト用）
-- =============================================================================

-- 現場データのサンプルを挿入（company_id = 1の場合）
-- 本番環境では削除すること
INSERT INTO work_sites (company_id, name, address) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', '新宿オフィス建設現場', '東京都新宿区西新宿1-1-1'),
  ('550e8400-e29b-41d4-a716-446655440000', '渋谷商業施設改修現場', '東京都渋谷区渋谷1-2-3'),
  ('550e8400-e29b-41d4-a716-446655440000', '品川マンション建設現場', '東京都品川区品川1-4-5')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- インデックス最適化
-- =============================================================================

-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_reports_user_date ON reports(user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_company_status ON reports(user_id, status) 
  WHERE status IN ('submitted', 'approved', 'rejected');
CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON report_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_work_sites_company ON work_sites(company_id);

-- =============================================================================
-- コメント
-- =============================================================================

COMMENT ON TABLE work_sites IS '作業現場マスタテーブル';
COMMENT ON TABLE reports IS '日報テーブル - 最小実務項目に最適化';
COMMENT ON TABLE report_attachments IS '日報添付ファイルテーブル';

COMMENT ON COLUMN reports.work_hours IS '作業時間（小数点対応）';
COMMENT ON COLUMN reports.progress_rate IS '進捗率（0-100%）';
COMMENT ON COLUMN reports.special_notes IS '特記事項（課題・明日の予定など）';
COMMENT ON COLUMN reports.status IS 'draft: 下書き, submitted: 提出済み, approved: 承認済み, rejected: 差戻し';
COMMENT ON COLUMN report_attachments.file_type IS 'photo: 写真, receipt: レシート, delivery_slip: 搬入書';