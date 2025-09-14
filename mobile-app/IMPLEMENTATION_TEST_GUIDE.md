# 実装テスト確認ガイド

## 1. Supabase Work Sites テーブル作成

### SQLの実行
```sql
-- Supabase Dashboard > SQL Editor でこのファイルを実行
/Users/watanabekuuya/Crafdy-mobile/mobile-app/supabase/migrations/001_create_work_sites.sql
```

### 確認方法
```sql
-- テーブルが作成されているか確認
SELECT * FROM work_sites LIMIT 5;

-- サンプルデータが挿入されているか確認
SELECT name, status, client_name FROM work_sites;
```

## 2. アプリ動作確認手順

### Metro Bundler起動状況
- Port 8084で起動中
- キャッシュクリア済み
- 依存関係の警告あり（react-native-svg版が古い）

### 確認ポイント

#### 2.1 THEME オブジェクト統合確認
```typescript
// DesignTokens.ts が正常に動作するか
import { DesignTokens, Colors, Spacing } from '@/constants/DesignTokens'
```

#### 2.2 QuickPrompts 現場管理ナビゲーション
- main-chat画面を開く
- クイックプロンプトバーに「現場管理」ボタンが表示されるか
- タップすると /work-sites に遷移するか

#### 2.3 請求書日付計算機能
```typescript
// invoice-api.ts の calculateDueDate 関数が動作するか
import { calculateDueDate } from '@/lib/invoice-api'
```

## 3. 実際のテスト手順

### Phase 1: 基本動作確認
1. Expo開発アプリでQRコードスキャン（Port 8084）
2. 認証画面が表示されるか
3. main-chat画面に遷移するか
4. デザイントークン（色・スペーシング）が正常に適用されているか

### Phase 2: 新機能確認
1. main-chat画面でクイックプロンプトバーを確認
2. 「現場管理」ボタンをタップ
3. /work-sites 画面に遷移するか（存在すれば）
4. エラーが発生せずナビゲーションが動作するか

### Phase 3: 統合確認
1. 設定画面でTHEMEオブジェクトが参照されているか
2. TypeScriptコンパイルエラーがないか
3. 全体的なUI一貫性が保たれているか

## 4. エラー対処

### よくある問題
1. **"Cannot read property 'lg' of undefined"**
   - DesignTokens.ts のインポートを確認
   - フォールバック値を確認

2. **Navigation エラー**
   - /work-sites ルートが存在するか確認
   - expo-router の設定確認

3. **TypeScript エラー**
   - 型定義の不整合を確認
   - import パスを確認

## 5. 成功基準

### 必須項目
- ✅ Metro Bundler 起動（Port 8084）
- ✅ Supabase work_sites テーブル作成
- ✅ main-chat から現場管理への遷移UI実装
- ✅ THEME、プロファイル、請求書日付計算の統合確認

### アプリ実行確認
- [ ] エラーなしでアプリが起動する
- [ ] main-chat画面が表示される
- [ ] クイックプロンプトに「現場管理」が表示される
- [ ] タップでナビゲーションが動作する（エラーになっても遷移意図があれば成功）
- [ ] デザインが一貫している

## 6. 次のステップ

成功した場合：
1. work-sites画面の実装
2. Supabase連携の完成
3. 本格的な現場管理機能の構築

失敗した場合：
1. エラーログの詳細解析
2. インポート・エクスポートの修正
3. 段階的な機能有効化