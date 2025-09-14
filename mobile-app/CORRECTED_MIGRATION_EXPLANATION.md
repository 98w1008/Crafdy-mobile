# 修正版マイグレーション説明書

## 問題の概要

元のマイグレーション（009_create_profiles_view_and_user_profiles.sql）で以下のエラーが発生：

```
ERROR: 42809: "profiles" is not a view
HINT: Use DROP VIEW to remove a table.
```

**原因**: 既存の`profiles`オブジェクトがテーブルであるにも関わらず、`DROP VIEW IF EXISTS`を実行しようとしたため。

## 修正版マイグレーション（010_corrected_profiles_migration.sql）の特徴

### 1. インテリジェントなオブジェクト判定
```sql
-- 既存のprofilesがテーブル/ビュー/存在しないを判定
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables...) THEN 'table'
        WHEN EXISTS (SELECT 1 FROM information_schema.views...) THEN 'view'
        ELSE 'none'
    END INTO object_type;
```

### 2. 安全なデータバックアップ
- **テーブルの場合**: タイムスタンプ付きでリネーム（`profiles_backup_20250906_143022`）
- **ビューの場合**: 安全に削除
- **存在しない場合**: スキップして続行

### 3. AuthContext期待構造に完全対応

AuthContextが期待する`profiles`ビュー:
```typescript
interface UserProfile {
  id: string              // user_id as id
  full_name: string | null
  email: string
  role: UserRole         // 'parent' | 'lead' | 'worker'
  company: string | null
  daily_rate?: number
  is_active: boolean
  created_at: string
  updated_at: string
}
```

対応するビュー構造:
```sql
CREATE OR REPLACE VIEW public.profiles AS
SELECT
    u.id AS user_id,
    u.email,
    COALESCE(p.display_name, split_part(u.email,'@',1)) AS display_name,
    COALESCE(p.role, 'worker') AS role,
    p.full_name,
    p.company,
    -- その他必要なフィールド...
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id;
```

### 4. インテリジェントなデータ移行

バックアップテーブルと新しい`user_profiles`テーブルの**共通カラムを自動検出**し、安全にデータ移行:

```sql
-- 共通カラムを動的に特定
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = backup_table_name
AND column_name IN (
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'user_profiles'
)
```

### 5. 堅牢なエラーハンドリング

- バックアップテーブルが見つからない場合はスキップ
- `companies`テーブルが存在しない場合は外部キー制約を削除
- 重複データは`ON CONFLICT DO NOTHING/UPDATE`で処理

### 6. 完全なRLS（Row Level Security）設定

```sql
-- ユーザーは自分のプロフィールのみアクセス可能
CREATE POLICY "read_own_profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);
```

### 7. 新規ユーザー自動プロフィール作成

```sql
-- 新規ユーザー登録時に自動的にuser_profilesレコードを作成
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

## 実行手順

1. **マイグレーションファイルの実行**:
```bash
supabase db push
```
または
```sql
-- SQLファイルを直接実行
\i /path/to/010_corrected_profiles_migration.sql
```

2. **動作確認**:
```sql
-- プロフィールビューの確認
SELECT * FROM public.profiles WHERE user_id = auth.uid();

-- user_profilesテーブルの確認
SELECT * FROM public.user_profiles WHERE user_id = auth.uid();

-- バックアップテーブルの確認
SELECT tablename FROM pg_tables WHERE tablename LIKE 'profiles_backup_%';
```

3. **AuthContextでの動作確認**:
```typescript
// AuthContextが正常にprofilesビューからデータを取得できることを確認
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

## 安全性の保証

1. **データ損失なし**: 元のテーブルはタイムスタンプ付きでバックアップ
2. **ロールバック可能**: バックアップテーブルから復元可能
3. **段階的実行**: 各ステップでエラーチェック
4. **権限保護**: RLSで適切なアクセス制御

## 注意点

- バックアップテーブル（`profiles_backup_YYYYMMDD_HHMMSS`）は手動削除が必要
- `companies`テーブルが後で作成される場合は、外部キー制約を手動で追加
- 大量データがある場合は、パフォーマンスに注意

この修正版マイグレーションにより、エラーなく安全にプロフィールシステムを移行できます。