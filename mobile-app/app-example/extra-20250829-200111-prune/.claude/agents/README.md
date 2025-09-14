# Claude Code Custom Agents

Crafdy Mobile プロジェクト専用のカスタムエージェント設定です。

## Available Agents

### 🚀 React Native Development Agent
**ファイル**: `react-native-dev.md`
**専門分野**: React Native/Expo開発、TypeScript、ナビゲーション
**担当**: コンポーネント開発、パフォーマンス最適化、デバッグ

### 🗄️ Supabase Backend Agent  
**ファイル**: `supabase-backend.md`
**専門分野**: Supabase統合、データベース設計、認証
**担当**: バックエンド機能、セキュリティ、リアルタイム機能

### 🎨 UI/UX Review Agent
**ファイル**: `ui-ux-review.md`
**専門分野**: デザインシステム、アクセシビリティ、ユーザビリティ
**担当**: デザインレビュー、UX最適化、日本語UI対応

### 🧪 Testing & QA Agent
**ファイル**: `testing-qa.md`
**専門分野**: テスト自動化、品質保証、パフォーマンステスト
**担当**: テスト戦略、バグ検出、品質管理

### 🔐 Security Audit Agent
**ファイル**: `security-audit.md`
**専門分野**: セキュリティ監査、データ保護、コンプライアンス
**担当**: 脆弱性対策、プライバシー保護、セキュリティテスト

### 🚨 Error Diagnostic Agent
**ファイル**: `error-diagnostic.md`
**専門分野**: エラー診断、トラブルシューティング、根本原因分析
**担当**: エラーパターン認識、問題解決、予防策提案

## Usage

これらのエージェントは、特定の専門分野に焦点を当ててClaude Codeがより効果的にサポートできるよう設計されています。

### エージェント呼び出し例

**React Native開発の問題**:
"React Native Development Agentとして、このコンポーネントのパフォーマンス問題を分析してください"

**セキュリティレビュー**:
"Security Audit Agentとして、この認証フローのセキュリティを評価してください"

**UI/UXレビュー**:
"UI/UX Review Agentとして、この画面のユーザビリティを改善してください"

**エラー診断**:
"Error Diagnostic Agentとして、このNetwork request failedエラーを分析してください"

## Agent Capabilities

各エージェントは以下の能力を持ちます：

- ✅ 専門分野の知識とベストプラクティス
- ✅ Crafdy Mobileプロジェクト固有の設定とコード規約
- ✅ 段階的な問題解決アプローチ
- ✅ 具体的なコード例とガイドライン
- ✅ 品質チェックリストと評価基準

## Project Context

すべてのエージェントは以下のプロジェクト情報を共有します：

- **プロジェクト名**: Crafdy Mobile
- **技術スタック**: React Native + Expo + Supabase
- **対象ユーザー**: 建設業界の現場作業者
- **主要機能**: プロジェクト管理、日報作成、チャット、見積もり
- **開発言語**: TypeScript、日本語UI

## Configuration

エージェントの動作設定は `.claude/settings.json` で管理されます。
各エージェントの専門性を活かして、より効率的な開発をサポートします。