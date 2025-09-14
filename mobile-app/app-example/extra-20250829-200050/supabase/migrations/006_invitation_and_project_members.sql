-- ================================
-- 招待コードと プロジェクトメンバー管理システム
-- ================================

-- 1. 招待コードテーブル
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'lead',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- インデックス
  CONSTRAINT valid_role CHECK (role IN ('lead', 'worker')),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- 2. プロジェクトメンバーテーブル（引き継ぎ機能付き）
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'lead',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- 制約
  CONSTRAINT valid_member_role CHECK (role IN ('parent', 'lead', 'worker')),
  CONSTRAINT valid_period CHECK (ended_at IS NULL OR ended_at > started_at),
  
  -- 同一プロジェクト、同一ユーザーで重複するアクティブメンバーシップを防ぐ
  CONSTRAINT unique_active_membership 
    EXCLUDE (project_id WITH =, user_id WITH =) 
    WHERE (ended_at IS NULL)
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_project ON invitation_codes(project_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_active ON project_members(project_id, user_id) WHERE ended_at IS NULL;

-- 4. RLS (Row Level Security) ポリシー

-- invitation_codes のRLS
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- 親アカウントは自分が作成した招待コードを管理可能
CREATE POLICY "Parents can manage their invitation codes" ON invitation_codes
  FOR ALL USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'parent'
    )
  );

-- 職長は有効な招待コードの検証時に読み取り可能（コード入力時）
CREATE POLICY "Anyone can validate active invitation codes" ON invitation_codes
  FOR SELECT USING (
    is_active = true AND 
    expires_at > NOW() AND
    used_at IS NULL
  );

-- project_members のRLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 親アカウントは自分のプロジェクトのメンバーを管理可能
CREATE POLICY "Parents can manage project members" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_members.project_id 
      AND projects.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'parent'
      )
    )
  );

-- ユーザーは自分のメンバーシップを閲覧可能
CREATE POLICY "Users can view their memberships" ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- 5. 便利なビュー作成

-- アクティブなプロジェクトメンバー
CREATE OR REPLACE VIEW active_project_members AS
SELECT 
  pm.*,
  p.name as project_name,
  pr.full_name,
  pr.company
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
WHERE pm.ended_at IS NULL;

-- 有効な招待コード
CREATE OR REPLACE VIEW valid_invitation_codes AS
SELECT 
  ic.*,
  p.name as project_name,
  pr.company
FROM invitation_codes ic
JOIN projects p ON ic.project_id = p.id
JOIN profiles pr ON ic.created_by = pr.id
WHERE ic.is_active = true 
  AND ic.expires_at > NOW() 
  AND ic.used_at IS NULL;

-- 6. 関数: プロジェクトメンバーの引き継ぎ
CREATE OR REPLACE FUNCTION handover_project_member(
  p_project_id UUID,
  p_old_user_id UUID,
  p_new_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  old_member_id UUID;
BEGIN
  -- 既存メンバーを終了
  UPDATE project_members 
  SET ended_at = NOW()
  WHERE project_id = p_project_id 
    AND user_id = p_old_user_id 
    AND ended_at IS NULL
  RETURNING id INTO old_member_id;
  
  -- 新メンバーを追加
  INSERT INTO project_members (project_id, user_id, role, started_at)
  VALUES (p_project_id, p_new_user_id, 'lead', NOW());
  
  RETURN old_member_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 関数: ユーザーのアクティブプロジェクト取得
CREATE OR REPLACE FUNCTION get_user_active_projects(p_user_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  role TEXT,
  started_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.project_id,
    p.name,
    pm.role,
    pm.started_at
  FROM project_members pm
  JOIN projects p ON pm.project_id = p.id
  WHERE pm.user_id = p_user_id 
    AND pm.ended_at IS NULL
  ORDER BY pm.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. トリガー: 期限切れ招待コードの自動無効化
CREATE OR REPLACE FUNCTION expire_invitation_codes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invitation_codes 
  SET is_active = false 
  WHERE expires_at <= NOW() 
    AND is_active = true;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 定期実行用のトリガー（実際の本番環境では cron job を推奨）
-- CREATE TRIGGER expire_codes_trigger
--   AFTER INSERT OR UPDATE ON invitation_codes
--   EXECUTE FUNCTION expire_invitation_codes();

-- 9. サンプルデータ（開発用）
-- INSERT INTO invitation_codes (code, project_id, created_by, expires_at)
-- VALUES ('TEST1234', (SELECT id FROM projects LIMIT 1), (SELECT id FROM profiles WHERE role = 'parent' LIMIT 1), NOW() + INTERVAL '72 hours');

COMMIT;