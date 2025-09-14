# 🏗️ クラフディアプリ - コアコンポーネント仕様書 v1.0

**作成日**: 2025年8月11日  
**対象**: 建設現場向けモバイルアプリケーション  
**デザインシステム**: Gray Design Tokens v1.0準拠  

---

## 📋 概要

建設現場での実用性を重視したコアコンポーネント10点の技術仕様書。グレーベースデザイン、高コントラスト、手袋操作対応、オフライン同期機能を包含した建設業界特化設計。

---

=== 1. ChatInput ===

【目的・用途】
建設現場でのAIチャット入力インターフェース。プラス（+）ボタン、テキスト入力、音声入力、送信ボタンを統合した複合入力コンポーネント。手袋着用時の操作性とオフライン対応を重視。

【Props Interface】
├── 必須props: 
│   ├── onSendMessage: (message: string, attachments?: File[]) => void - メッセージ送信時のコールバック
│   └── placeholder: string - プレースホルダーテキスト
├── オプションprops:
│   ├── disabled?: boolean - 無効状態フラグ（デフォルト: false）
│   ├── maxLength?: number - 最大文字数制限（デフォルト: 1000）
│   ├── showVoiceButton?: boolean - 音声ボタン表示フラグ（デフォルト: true）
│   ├── showAttachButton?: boolean - 添付ボタン表示フラグ（デフォルト: true）
│   └── isOffline?: boolean - オフライン状態フラグ（デフォルト: false）
└── イベントハンドラー:
    ├── onVoiceStart?: () => void - 音声入力開始時
    ├── onVoiceEnd?: (transcript: string) => void - 音声入力終了時
    ├── onAttachmentSelect?: (files: File[]) => void - ファイル添付時
    └── onTextChange?: (text: string) => void - テキスト変更時

【内部状態管理】
├── inputText: string - 入力テキスト状態
├── isRecording: boolean - 音声録音状態
├── attachments: File[] - 添付ファイル配列
├── isSending: boolean - 送信中フラグ
└── voicePermission: 'granted' | 'denied' | 'pending' - 音声権限状態

【グレーデザイントークン適用】
├── 通常状態: #FFFFFF背景 + #D1D5DB枠線 - 入力フィールド
├── フォーカス状態: #FFFFFF背景 + #52525B枠線 - フォーカス時
├── 無効状態: #F3F4F6背景 + #D1D5DB枠線 - 無効時
├── エラー状態: #FEF2F2背景 + #DC2626枠線 - エラー時
├── ボタン通常: #52525B背景 + #FFFFFF文字 - 送信ボタン
├── ボタンホバー: #71717A背景 - ホバー時
├── ボタン押下: #3F3F46背景 - 押下時
└── ボタン無効: #D1D5DB背景 + #9CA3AF文字 - 無効時

【エラーハンドリング】
├── 音声権限エラー: 権限拒否時 → 権限要求ダイアログ表示 + テキスト入力にフォールバック
├── ネットワークエラー: オフライン時 → ローカル保存 + 同期待機状態表示
├── 文字数制限エラー: 最大文字数超過 → 警告表示 + 送信無効化
├── 添付ファイルエラー: ファイルサイズ/形式不正 → エラーメッセージ表示
└── 復旧処理: 自動リトライ（3回）+ 手動再送信ボタン

【建設現場最適化】
├── 手袋対応: 全ボタン48pt以上（+ボタン: 56pt, 送信: 52pt）
├── 視認性: 高コントラスト枠線（#52525B） + 大きな文字（18px）
├── 耐久性: 防塵カバー状態でのタッチ感度調整 + 誤タップ防止
└── 騒音対応: 音声入力時の視覚的波形表示 + バイブレーション フィードバック

【使用例】
```tsx
<ChatInput 
  placeholder="現場の状況を入力..."
  onSendMessage={(message, attachments) => handleSend(message, attachments)}
  onVoiceStart={() => setIsListening(true)}
  maxLength={800}
  isOffline={networkStatus === 'offline'}
/>
```

---

=== 2. PromptChips ===

【目的・用途】
頻用質問やAI提案を素早く選択できるチップ形式コンポーネント。展開/収納機能とAI学習による並び替え機能を搭載。建設現場の定型業務に最適化。

【Props Interface】
├── 必須props: 
│   ├── chips: ChipData[] - チップデータ配列
│   └── onChipSelect: (chip: ChipData) => void - チップ選択時コールバック
├── オプションprops:
│   ├── maxVisible?: number - 初期表示数（デフォルト: 3）
│   ├── enableAISort?: boolean - AI並び替え有効化（デフォルト: true）
│   ├── category?: string - チップカテゴリ（デフォルト: 'general'）
│   ├── disabled?: boolean - 無効状態（デフォルト: false）
│   └── customPrompts?: ChipData[] - カスタムプロンプト配列
└── イベントハンドラー:
    ├── onExpand?: () => void - 展開時
    ├── onCollapse?: () => void - 収納時
    ├── onCustomAdd?: (prompt: string) => void - カスタムプロンプト追加時
    └── onUsageTracking?: (chipId: string) => void - 使用回数トラッキング

【内部状態管理】
├── isExpanded: boolean - 展開状態フラグ
├── visibleChips: ChipData[] - 表示中チップ配列
├── sortedChips: ChipData[] - AI並び替え後配列
├── usageCount: Record<string, number> - チップ使用回数記録
└── loading: boolean - AI並び替え処理中フラグ

【グレーデザイントークン適用】
├── チップ通常: #E5E7EB背景 + #52525B文字 - 通常チップ
├── チップホバー: #D1D5DB背景 + #3F3F46文字 - ホバー時
├── チップ選択: #52525B背景 + #FFFFFF文字 - 選択時
├── チップ無効: #F3F4F6背景 + #D1D5DB文字 - 無効時
├── 展開ボタン: #71717A背景 + #FFFFFF文字 - 展開/収納ボタン
├── カテゴリ表示: #9CA3AF文字 - カテゴリラベル
└── 区切り線: #E5E7EB - カテゴリ間の区切り

【エラーハンドリング】
├── AI並び替えエラー: API失敗時 → 使用頻度順フォールバック + エラーログ記録
├── データ読み込みエラー: チップ取得失敗 → デフォルトチップ表示 + リトライボタン
├── ストレージエラー: 使用回数保存失敗 → メモリ内保持 + 次回起動時再同期
├── カスタム追加エラー: 不正データ → バリデーション警告表示
└── 復旧処理: 自動復旧（ローカルキャッシュ利用） + 手動リフレッシュボタン

【建設現場最適化】
├── 手袋対応: チップ最小44pt + タッチマージン8pt
├── 視認性: 明確な境界線 + 16px以上文字サイズ
├── 耐久性: 水滴対応（タッチイベント調整） + 汚れによる誤操作防止
└── 騒音対応: 選択時のハプティックフィードバック + 視覚的選択状態

【使用例】
```tsx
<PromptChips 
  chips={constructionPrompts}
  onChipSelect={(chip) => handlePromptSelect(chip)}
  category="daily_report"
  maxVisible={4}
  enableAISort={true}
  onUsageTracking={(chipId) => analytics.track('chip_usage', chipId)}
/>
```

---

=== 3. AIActionCard ===

【目的・用途】
AI生成されたアクション提案を表示するカードコンポーネント。KPI表示、提案内容、共有機能を統合。建設プロジェクトの意思決定支援と進捗可視化。

【Props Interface】
├── 必須props: 
│   ├── action: AIActionData - AIアクションデータ
│   ├── kpiMetrics: KPIData[] - KPI指標配列
│   └── onActionExecute: (actionId: string) => void - アクション実行コールバック
├── オプションprops:
│   ├── showKPI?: boolean - KPI表示フラグ（デフォルト: true）
│   ├── enableShare?: boolean - 共有機能有効化（デフォルト: true）
│   ├── priority?: 'high' | 'medium' | 'low' - 優先度レベル（デフォルト: 'medium'）
│   ├── deadline?: Date - 期限日時
│   └── assignee?: UserData - 担当者情報
└── イベントハンドラー:
    ├── onShare?: (actionData: AIActionData) => void - 共有時
    ├── onKPIExpand?: (kpiId: string) => void - KPI詳細展開時
    ├── onAssign?: (userId: string) => void - 担当者割り当て時
    ├── onFeedback?: (rating: number, comment?: string) => void - AI提案評価時
    └── onBookmark?: (actionId: string) => void - ブックマーク時

【内部状態管理】
├── expanded: boolean - カード展開状態
├── kpiExpanded: boolean - KPI詳細展開状態
├── shareMenuOpen: boolean - 共有メニュー開閉状態
├── actionStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled' - アクション状態
├── userFeedback: FeedbackData | null - ユーザーフィードバック
└── bookmarked: boolean - ブックマーク状態

【グレーデザイントークン適用】
├── カード背景: #FFFFFF + shadow.card - メインカード
├── KPI背景: #F3F4F6 + #E5E7EB枠線 - KPI表示エリア
├── 高優先度: #FEF2F2背景 + #DC2626アクセント - 高優先度カード
├── 中優先度: #FFFBEB背景 + #D97706アクセント - 中優先度カード
├── 低優先度: #F0FDF4背景 + #16A34A アクセント - 低優先度カード
├── アクションボタン: #52525B背景 + #FFFFFF文字 - 実行ボタン
├── 共有ボタン: #71717A背景 + #FFFFFF文字 - 共有ボタン
├── ステータス完了: #16A34A背景 + #FFFFFF文字 - 完了状態
└── ステータス保留: #D97706背景 + #FFFFFF文字 - 保留状態

【エラーハンドリング】
├── AIデータ取得エラー: API失敗時 → エラーカード表示 + リトライボタン
├── KPI計算エラー: データ不足時 → 「データ不足」表示 + 更新ボタン
├── 共有機能エラー: 共有失敗時 → エラートースト + 手動コピー機能
├── 実行エラー: アクション実行失敗 → エラー詳細表示 + ロールバック機能
└── 復旧処理: 自動リトライ（指数バックオフ） + 手動リフレッシュ

【建設現場最適化】
├── 手袋対応: 全ボタン48pt以上 + 十分なタッチマージン（16pt）
├── 視認性: 高コントラストKPI表示 + 大きな数値（24px+）
├── 耐久性: 重要データの自動保存 + オフライン表示対応
└── 騒音対応: 重要度に応じた視覚的ハイライト + バイブレーション通知

【使用例】
```tsx
<AIActionCard 
  action={aiRecommendation}
  kpiMetrics={projectKPIs}
  onActionExecute={(actionId) => handleActionExecution(actionId)}
  priority="high"
  deadline={new Date('2024-12-15')}
  onShare={(data) => shareToTeam(data)}
  onFeedback={(rating, comment) => submitAIFeedback(rating, comment)}
/>
```

---

=== 4. GrayButton ===

【目的・用途】
グレーベースデザインシステムの標準ボタンコンポーネント。無彩色デザインで建設現場の視認性を最適化。サイズバリエーション、状態管理、アクセシビリティ対応。

【Props Interface】
├── 必須props: 
│   ├── children: React.ReactNode - ボタン内容
│   └── onPress: () => void - 押下時コールバック
├── オプションprops:
│   ├── variant?: 'primary' | 'secondary' | 'ghost' | 'outline' - バリアント（デフォルト: 'primary'）
│   ├── size?: 'small' | 'medium' | 'large' | 'xlarge' - サイズ（デフォルト: 'medium'）
│   ├── disabled?: boolean - 無効状態（デフォルト: false）
│   ├── loading?: boolean - ローディング状態（デフォルト: false）
│   ├── fullWidth?: boolean - 全幅表示（デフォルト: false）
│   ├── icon?: string - アイコン名
│   └── iconPosition?: 'left' | 'right' - アイコン位置（デフォルト: 'left'）
└── イベントハンドラー:
    ├── onLongPress?: () => void - 長押し時
    ├── onPressIn?: () => void - 押下開始時
    └── onPressOut?: () => void - 押下終了時

【内部状態管理】
├── pressed: boolean - 押下状態
├── focused: boolean - フォーカス状態
├── hovered: boolean - ホバー状態（Web対応）
└── loadingProgress: number - ローディング進行度

【グレーデザイントークン適用】
├── Primary通常: #52525B背景 + #FFFFFF文字 - プライマリボタン
├── Primary押下: #3F3F46背景 + #FFFFFF文字 - 押下時
├── Primary無効: #D1D5DB背景 + #9CA3AF文字 - 無効時
├── Secondary通常: transparent背景 + #52525B文字 + #D1D5DB枠線 - セカンダリ
├── Secondary押下: #E5E7EB背景 + #3F3F46文字 - 押下時
├── Ghost通常: transparent背景 + #52525B文字 - ゴーストボタン
├── Ghost押下: #F3F4F6背景 + #3F3F46文字 - 押下時
├── Outline通常: transparent背景 + #52525B文字 + #52525B枠線 - アウトライン
└── Loading状態: #71717A背景 + スピナー表示 - ローディング時

【エラーハンドリング】
├── 押下イベントエラー: コールバック例外時 → エラーログ + 視覚的フィードバック
├── アイコン読み込みエラー: アイコン未発見時 → フォールバックアイコン表示
├── 無効状態エラー: 無効時の操作 → 何も実行せず + アクセシビリティ通知
├── ローディングタイムアウト: 長時間ローディング → タイムアウト表示 + キャンセル機能
└── 復旧処理: 自動状態リセット + 手動リトライオプション

【建設現場最適化】
├── 手袋対応: 最小44pt（small）、推奨52pt（medium）、推奨60pt（large）
├── 視認性: 高コントラスト文字（4.5:1以上） + 明確な境界線
├── 耐久性: 防水・防塵対応タッチ感度 + 重複タップ防止（500ms）
└── 騒音対応: 押下時ハプティックフィードバック + 視覚的状態変化

【使用例】
```tsx
<GrayButton 
  variant="primary"
  size="large" 
  onPress={handleSubmit}
  loading={isSubmitting}
  icon="check-circle"
  disabled={!formValid}
>
  作業完了報告
</GrayButton>
```

---

=== 5. VoiceInput ===

【目的・用途】
建設現場に特化した音声入力コンポーネント。タップ時の音声転写とロングプレス時のAI要約機能を提供。騒音環境での音声認識最適化と手袋操作対応。

【Props Interface】
├── 必須props: 
│   ├── onTranscript: (text: string) => void - 転写完了時コールバック
│   └── onSummary: (summary: string) => void - AI要約完了時コールバック
├── オプションprops:
│   ├── language?: string - 音声認識言語（デフォルト: 'ja-JP'）
│   ├── maxRecordingTime?: number - 最大録音時間（秒、デフォルト: 60）
│   ├── noiseReduction?: boolean - ノイズリダクション（デフォルト: true）
│   ├── continuousMode?: boolean - 連続録音モード（デフォルト: false）
│   ├── autoSummary?: boolean - 自動要約有効化（デフォルト: true）
│   └── customPrompts?: string[] - AI要約用カスタムプロンプト
└── イベントハンドラー:
    ├── onRecordingStart?: () => void - 録音開始時
    ├── onRecordingStop?: () => void - 録音終了時
    ├── onVolumeChange?: (volume: number) => void - 音量変化時
    ├── onError?: (error: VoiceError) => void - エラー時
    └── onPermissionRequest?: () => void - 権限要求時

【内部状態管理】
├── recordingState: 'idle' | 'recording' | 'processing' | 'error' - 録音状態
├── recordingTime: number - 現在の録音時間
├── audioLevel: number - 音声レベル（0-100）
├── transcriptBuffer: string - 転写バッファ
├── permission: 'granted' | 'denied' | 'pending' - マイクアクセス権限
├── isLongPress: boolean - ロングプレス状態
└── processingType: 'transcript' | 'summary' - 処理タイプ

【グレーデザイントークン適用】
├── 待機状態: #52525B背景 + #FFFFFF アイコン - 通常時
├── 録音中: #DC2626背景 + #FFFFFF アイコン + 脈動アニメーション - 録音時
├── 処理中: #D97706背景 + スピナー + #FFFFFF文字 - 処理時
├── 完了状態: #16A34A背景 + #FFFFFF チェックアイコン - 完了時
├── エラー状態: #DC2626背景 + #FFFFFF エラーアイコン - エラー時
├── 無効状態: #D1D5DB背景 + #9CA3AF アイコン - 無効時
├── 音声レベル表示: #71717A - #52525B グラデーション - 音声波形
└── タイマー表示: #6B7280文字 + #E5E7EB背景 - 録音時間

【エラーハンドリング】
├── 権限拒否エラー: マイクアクセス拒否 → 権限要求ダイアログ + 設定画面誘導
├── ネットワークエラー: API接続失敗 → ローカル転写 + 後日同期
├── 音声認識エラー: 転写失敗 → エラー表示 + 手動入力フォールバック
├── ノイズレベル過多: 騒音環境検出 → ノイズリダクション強化 + ユーザー通知
├── タイムアウトエラー: 最大録音時間超過 → 自動終了 + 部分転写表示
└── 復旧処理: 自動リトライ（3回） + 手動再録音ボタン

【建設現場最適化】
├── 手袋対応: 60pt大型ボタン + 長押し検知（800ms）
├── 視認性: 明確な録音状態表示 + 高コントラストアイコン（24px+）
├── 騒音対応: ノイズキャンセリング + 指向性マイク最適化
└── 耐久性: 防水・防塵対応 + バッテリー効率化

【使用例】
```tsx
<VoiceInput 
  onTranscript={(text) => setInputText(text)}
  onSummary={(summary) => handleSummary(summary)}
  language="ja-JP"
  noiseReduction={true}
  maxRecordingTime={120}
  onError={(error) => handleVoiceError(error)}
  customPrompts={['建設現場の日報', '安全点検の要約']}
/>
```

---

=== 6. DrawerMenu ===

【目的・用途】
建設現場向けハンバーガーメニューの実装。画面の50%幅で表示し、プロジェクト切り替え、設定、ユーザー情報へのクイックアクセスを提供。手袋操作に最適化。

【Props Interface】
├── 必須props: 
│   ├── isOpen: boolean - ドロワー開閉状態
│   ├── onClose: () => void - ドロワー閉じるコールバック
│   └── menuItems: MenuItem[] - メニューアイテム配列
├── オプションprops:
│   ├── width?: number - ドロワー幅（デフォルト: 画面の50%）
│   ├── position?: 'left' | 'right' - 表示位置（デフォルト: 'left'）
│   ├── overlay?: boolean - オーバーレイ表示（デフォルト: true）
│   ├── userInfo?: UserInfo - ユーザー情報
│   ├── currentProject?: ProjectInfo - 現在のプロジェクト情報
│   └── animationDuration?: number - アニメーション時間（ms、デフォルト: 300）
└── イベントハンドラー:
    ├── onMenuItemSelect?: (itemId: string) => void - メニューアイテム選択時
    ├── onProjectSwitch?: (projectId: string) => void - プロジェクト切り替え時
    ├── onUserProfileTap?: () => void - ユーザープロフィールタップ時
    └── onOverlayTap?: () => void - オーバーレイタップ時

【内部状態管理】
├── animationState: 'closed' | 'opening' | 'open' | 'closing' - アニメーション状態
├── translateX: Animated.Value - スライドアニメーション値
├── overlayOpacity: Animated.Value - オーバーレイ透明度アニメーション
├── selectedItemId: string | null - 選択中メニューアイテムID
└── gestureEnabled: boolean - ジェスチャー操作有効状態

【グレーデザイントークン適用】
├── ドロワー背景: #FFFFFF + shadow.modal - メインドロワー
├── オーバーレイ: rgba(0, 0, 0, 0.4) - 背景オーバーレイ
├── ヘッダー背景: #F3F4F6 + #E5E7EB下枠線 - ユーザー情報エリア
├── メニュー通常: transparent背景 + #111827文字 - 通常メニューアイテム
├── メニューホバー: #F3F4F6背景 + #52525B文字 - ホバー時
├── メニュー選択: #E5E7EB背景 + #3F3F46文字 - 選択時
├── 区切り線: #E5E7EB - メニューアイテム間
├── アイコン: #52525B - メニューアイコン
└── 閉じるボタン: #71717A背景 + #FFFFFF文字 - 閉じるボタン

【エラーハンドリング】
├── アニメーションエラー: アニメーション失敗 → 即座に状態変更 + ログ記録
├── メニューデータエラー: アイテム読み込み失敗 → デフォルトメニュー表示
├── ユーザー情報エラー: 情報取得失敗 → 「読み込み中」表示 + リトライ
├── プロジェクト切り替えエラー: 切り替え失敗 → エラートースト + 元の状態に復帰
└── 復旧処理: 自動復旧（ローカルキャッシュ利用） + 手動リフレッシュ

【建設現場最適化】
├── 手袋対応: メニューアイテム最小52pt + タッチマージン12pt
├── 視認性: 高コントラスト文字（18px+） + 明確なアイコン（24px）
├── 耐久性: スワイプジェスチャー調整 + 誤操作防止
└── 騒音対応: 選択時のハプティックフィードバック + 視覚的ハイライト

【使用例】
```tsx
<DrawerMenu 
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  menuItems={constructionMenuItems}
  userInfo={currentUser}
  currentProject={activeProject}
  onMenuItemSelect={(itemId) => handleMenuNavigation(itemId)}
  onProjectSwitch={(projectId) => switchProject(projectId)}
  width={screenWidth * 0.5}
/>
```

---

=== 7. ProgressSlider ===

【目的・用途】
建設プロジェクトの進捗を視覚化・操作するスライダーコンポーネント。パーセント表示、AI進捗判定、マイルストーン表示機能を統合。プロジェクト管理の直感的操作を実現。

【Props Interface】
├── 必須props: 
│   ├── value: number - 現在の進捗値（0-100）
│   ├── onChange: (value: number) => void - 値変更時コールバック
│   └── projectId: string - プロジェクトID
├── オプションprops:
│   ├── aiEnabled?: boolean - AI判定有効化（デフォルト: true）
│   ├── showMilestones?: boolean - マイルストーン表示（デフォルト: true）
│   ├── milestones?: Milestone[] - マイルストーン配列
│   ├── disabled?: boolean - 無効状態（デフォルト: false）
│   ├── step?: number - ステップ値（デフォルト: 1）
│   ├── minValue?: number - 最小値（デフォルト: 0）
│   ├── maxValue?: number - 最大値（デフォルト: 100）
│   └── showAIIndicator?: boolean - AI判定表示（デフォルト: true）
└── イベントハンドラー:
    ├── onAIAnalysis?: (analysis: ProgressAnalysis) => void - AI分析完了時
    ├── onMilestoneReach?: (milestone: Milestone) => void - マイルストーン到達時
    ├── onValueCommit?: (finalValue: number) => void - 値確定時
    └── onValidationFail?: (error: ValidationError) => void - バリデーション失敗時

【内部状態管理】
├── currentValue: number - 現在のスライダー値
├── aiPredictedValue: number | null - AI予測進捗値
├── isDragging: boolean - ドラッグ状態
├── aiAnalysisLoading: boolean - AI分析中フラグ
├── milestoneStates: Record<string, 'pending' | 'current' | 'completed'> - マイルストーン状態
└── validationError: string | null - バリデーションエラーメッセージ

【グレーデザイントークン適用】
├── スライダートラック: #E5E7EB背景 + 8px高さ - ベーストラック
├── 進捗バー: #52525B背景 - 現在の進捗
├── AI予測バー: #71717A背景 + 50%透明度 - AI予測進捗
├── スライダーサム: #FFFFFF背景 + #52525B枠線 + shadow.md - つまみ
├── サムドラッグ中: #52525B背景 + #FFFFFF中心 - ドラッグ時
├── マイルストーン完了: #16A34A背景 - 完了マイルストーン
├── マイルストーン現在: #D97706背景 - 現在のマイルストーン
├── マイルストーン保留: #D1D5DB背景 - 保留マイルストーン
├── パーセント表示: #111827文字 + 20px - 進捗パーセント
└── AI信頼度: #6B7280文字 + 14px - AI判定信頼度

【エラーハンドリング】
├── AI分析エラー: API失敗時 → 手動入力モードに切り替え + エラー表示
├── 進捗値検証エラー: 不正値入力時 → 前回値に復帰 + 警告表示
├── マイルストーンデータエラー: データ不整合 → デフォルト表示 + 管理者通知
├── ネットワークエラー: オフライン時 → ローカル保存 + 同期待機
└── 復旧処理: 自動リトライ（指数バックオフ） + 手動更新ボタン

【建設現場最適化】
├── 手袋対応: スライダーサム32pt + タッチ判定エリア48pt
├── 視認性: 高コントラスト配色 + 大きなパーセント表示（20px）
├── 耐久性: ドラッグ感度調整 + 誤操作防止（確定ボタン）
└── 騒音対応: ドラッグ時のハプティックフィードバック + 値変更の視覚確認

【使用例】
```tsx
<ProgressSlider 
  value={projectProgress}
  onChange={(newValue) => updateProgress(newValue)}
  projectId={currentProject.id}
  aiEnabled={true}
  milestones={projectMilestones}
  onAIAnalysis={(analysis) => handleAIFeedback(analysis)}
  onMilestoneReach={(milestone) => celebrateMilestone(milestone)}
  showMilestones={true}
/>
```

---

=== 8. ReceiptCamera ===

【目的・用途】
建設現場でのレシート・請求書撮影とOCR統合コンポーネント。自動文字認識、データ抽出、経費管理システム連携機能を提供。現場での即座な経費記録を実現。

【Props Interface】
├── 必須props: 
│   ├── onCaptureComplete: (ocrData: OCRResult) => void - 撮影・OCR完了コールバック
│   └── projectId: string - 関連プロジェクトID
├── オプションprops:
│   ├── autoCapture?: boolean - 自動撮影有効化（デフォルト: false）
│   ├── ocrEnabled?: boolean - OCR機能有効化（デフォルト: true）
│   ├── supportedFormats?: string[] - サポート画像形式（デフォルト: ['jpg', 'png']）
│   ├── maxImageSize?: number - 最大画像サイズ（MB、デフォルト: 5）
│   ├── compressionQuality?: number - 圧縮品質（0-1、デフォルト: 0.8）
│   ├── cropEnabled?: boolean - トリミング機能（デフォルト: true）
│   └── multipleCapture?: boolean - 複数撮影モード（デフォルト: false）
└── イベントハンドラー:
    ├── onImageCapture?: (imageUri: string) => void - 画像撮影完了時
    ├── onOCRStart?: () => void - OCR処理開始時
    ├── onOCRProgress?: (progress: number) => void - OCR進捗時
    ├── onError?: (error: CameraError) => void - エラー時
    └── onPermissionRequest?: (permission: string) => void - 権限要求時

【内部状態管理】
├── cameraState: 'idle' | 'ready' | 'capturing' | 'processing' - カメラ状態
├── ocrProgress: number - OCR処理進捗（0-100）
├── capturedImages: CapturedImage[] - 撮影済み画像配列
├── ocrResults: OCRResult[] - OCR結果配列
├── permissions: CameraPermissions - カメラ・ストレージ権限状態
├── flashMode: 'off' | 'on' | 'auto' - フラッシュモード
└── focusPoint: {x: number, y: number} | null - フォーカスポイント

【グレーデザイントークン適用】
├── カメラビューファインダー: transparent背景 + #52525B オーバーレイ - ビューファインダー
├── キャプチャーボタン: #FFFFFF背景 + #52525B枠線 - 撮影ボタン
├── キャプチャー押下: #52525B背景 + #FFFFFF中心 - 撮影時
├── フラッシュボタン: #71717A背景 + #FFFFFF アイコン - フラッシュ切り替え
├── プレビュー背景: #F3F4F6 - 画像プレビューエリア
├── OCR処理中: #D97706背景 + #FFFFFF文字 + スピナー - 処理中表示
├── 成功状態: #16A34A背景 + #FFFFFF チェックアイコン - OCR完了
├── エラー状態: #DC2626背景 + #FFFFFF エラーアイコン - エラー時
├── プログレスバー: #E5E7EB背景 + #52525B進捗 - OCR進捗表示
└── 結果表示: #FFFFFF背景 + shadow.card - OCR結果カード

【エラーハンドリング】
├── カメラ権限エラー: アクセス拒否時 → 権限要求ダイアログ + 設定誘導
├── 画像品質エラー: 不鮮明画像 → 再撮影案内 + 撮影ガイド表示
├── OCR処理エラー: 文字認識失敗 → 手動入力フォールバック + 部分結果表示
├── ファイルサイズエラー: サイズ超過 → 自動圧縮 + ユーザー通知
├── ネットワークエラー: オフライン時 → ローカル保存 + 同期待機
└── 復旧処理: 自動リトライ（OCR：3回） + 手動再処理ボタン

【建設現場最適化】
├── 手袋対応: キャプチャーボタン64pt + 音量ボタン撮影対応
├── 視認性: 明るい環境での自動露出調整 + フォーカス支援ガイド
├── 耐久性: 防水ケース対応 + レンズ汚れ検知・警告
└── 騒音対応: 撮影完了のハプティック + 視覚的成功表示

【使用例】
```tsx
<ReceiptCamera 
  onCaptureComplete={(ocrData) => handleReceiptData(ocrData)}
  projectId={currentProject.id}
  ocrEnabled={true}
  autoCapture={false}
  cropEnabled={true}
  onError={(error) => handleCameraError(error)}
  compressionQuality={0.8}
  maxImageSize={3}
/>
```

---

=== 9. EstimateBuilder ===

【目的・用途】
AI生成見積もりテンプレートとインライン編集機能を統合したコンポーネント。建設プロジェクトの見積書作成、リアルタイム計算、承認ワークフロー機能を提供。

【Props Interface】
├── 必須props: 
│   ├── projectData: ProjectData - プロジェクト基本データ
│   ├── onEstimateUpdate: (estimate: EstimateData) => void - 見積更新コールバック
│   └── onEstimateComplete: (finalEstimate: EstimateData) => void - 見積完成コールバック
├── オプションprops:
│   ├── aiTemplateEnabled?: boolean - AIテンプレート有効化（デフォルト: true）
│   ├── realTimeCalculation?: boolean - リアルタイム計算（デフォルト: true）
│   ├── allowCustomItems?: boolean - カスタムアイテム追加（デフォルト: true）
│   ├── templateLibrary?: EstimateTemplate[] - テンプレートライブラリ
│   ├── approvalWorkflow?: boolean - 承認ワークフロー有効（デフォルト: false）
│   ├── currencyCode?: string - 通貨コード（デフォルト: 'JPY'）
│   └── taxRate?: number - 税率（デフォルト: 0.1）
└── イベントハンドラー:
    ├── onAIGenerate?: (template: EstimateTemplate) => void - AI生成完了時
    ├── onItemAdd?: (item: EstimateItem) => void - アイテム追加時
    ├── onItemEdit?: (itemId: string, changes: Partial<EstimateItem>) => void - アイテム編集時
    ├── onItemDelete?: (itemId: string) => void - アイテム削除時
    ├── onApprovalRequest?: (estimate: EstimateData) => void - 承認依頼時
    └── onExport?: (format: 'pdf' | 'excel' | 'csv') => void - エクスポート時

【内部状態管理】
├── estimateData: EstimateData - 見積データ
├── editingItemId: string | null - 編集中アイテムID
├── aiGenerating: boolean - AI生成中フラグ
├── calculationResults: CalculationResults - 計算結果
├── validationErrors: ValidationError[] - バリデーションエラー配列
├── approvalStatus: ApprovalStatus - 承認状態
├── unsavedChanges: boolean - 未保存変更フラグ
└── exportProgress: number - エクスポート進捗

【グレーデザイントークン適用】
├── メインカード: #FFFFFF背景 + shadow.card - 見積書カード
├── ヘッダー背景: #F3F4F6 + #E5E7EB下枠線 - ヘッダーエリア
├── アイテム行通常: transparent背景 + #111827文字 - 通常アイテム行
├── アイテム行編集: #FFFBEB背景 + #D97706左枠線 - 編集中行
├── 小計背景: #F3F4F6 + #6B7280文字 - 小計エリア
├── 合計背景: #E5E7EB + #111827文字 + font-weight:bold - 合計エリア
├── AIボタン: #52525B背景 + #FFFFFF文字 - AI生成ボタン
├── 追加ボタン: #71717A背景 + #FFFFFF文字 - アイテム追加
├── 削除ボタン: #DC2626背景 + #FFFFFF文字 - アイテム削除
├── 承認ボタン: #16A34A背景 + #FFFFFF文字 - 承認依頼
├── エクスポートボタン: #D97706背景 + #FFFFFF文字 - エクスポート
└── エラー表示: #FEF2F2背景 + #DC2626文字 - バリデーションエラー

【エラーハンドリング】
├── AI生成エラー: API失敗時 → 手動作成モード + エラートースト
├── 計算エラー: 数値不正時 → エラーハイライト + 自動修正提案
├── バリデーションエラー: 必須項目不足 → 該当欄ハイライト + エラーメッセージ
├── 保存エラー: データ保存失敗 → 自動リトライ + ローカル一時保存
├── エクスポートエラー: 出力失敗 → 別形式提案 + 手動ダウンロード
└── 復旧処理: 自動保存（30秒間隔） + 手動保存ボタン

【建設現場最適化】
├── 手袋対応: 編集エリア48pt以上 + ドラッグハンドル対応
├── 視認性: 数値の大きな表示（20px） + 高コントラスト計算結果
├── 耐久性: オフライン編集対応 + 自動バックアップ（ローカルストレージ）
└── 騒音対応: 計算完了のハプティック + 視覚的更新表示

【使用例】
```tsx
<EstimateBuilder 
  projectData={currentProject}
  onEstimateUpdate={(estimate) => saveEstimateDraft(estimate)}
  onEstimateComplete={(finalEstimate) => submitEstimate(finalEstimate)}
  aiTemplateEnabled={true}
  realTimeCalculation={true}
  allowCustomItems={true}
  approvalWorkflow={true}
  onAIGenerate={(template) => handleAITemplate(template)}
  onExport={(format) => exportEstimate(format)}
/>
```

---

=== 10. OfflineSync ===

【目的・用途】
建設現場のネットワーク不安定環境に対応したオフライン同期コンポーネント。データの自動保存、差分同期、競合解決機能を提供し、現場での継続的な作業を保証。

【Props Interface】
├── 必須props: 
│   ├── dataSource: string - 同期対象データソース
│   ├── onSyncComplete: (result: SyncResult) => void - 同期完了コールバック
│   └── syncInterval?: number - 同期間隔（ms、デフォルト: 30000）
├── オプションprops:
│   ├── autoSync?: boolean - 自動同期有効化（デフォルト: true）
│   ├── conflictResolution?: 'manual' | 'auto_server' | 'auto_local' - 競合解決方式（デフォルト: 'manual'）
│   ├── maxOfflineStorage?: number - 最大オフラインストレージ（MB、デフォルト: 100）
│   ├── compressionEnabled?: boolean - データ圧縮有効化（デフォルト: true）
│   ├── priorityData?: string[] - 優先同期データ配列
│   ├── backgroundSync?: boolean - バックグラウンド同期（デフォルト: true）
│   └── retryAttempts?: number - リトライ回数（デフォルト: 3）
└── イベントハンドラー:
    ├── onOfflineMode?: (isOffline: boolean) => void - オフライン状態変化時
    ├── onSyncProgress?: (progress: SyncProgress) => void - 同期進捗時
    ├── onConflictDetected?: (conflicts: DataConflict[]) => void - 競合検出時
    ├── onStorageWarning?: (usage: StorageUsage) => void - ストレージ警告時
    └── onError?: (error: SyncError) => void - 同期エラー時

【内部状態管理】
├── isOnline: boolean - オンライン状態
├── syncStatus: 'idle' | 'syncing' | 'paused' | 'error' - 同期状態
├── lastSyncTime: Date | null - 最終同期時刻
├── pendingChanges: PendingChange[] - 保留中変更配列
├── conflictQueue: DataConflict[] - 競合キュー
├── storageUsage: StorageUsage - ストレージ使用状況
├── syncProgress: number - 同期進捗（0-100）
└── networkQuality: 'poor' | 'fair' | 'good' - ネットワーク品質

【グレーデザイントークン適用】
├── オンライン状態: #16A34A背景 + #FFFFFF アイコン - オンライン表示
├── オフライン状態: #DC2626背景 + #FFFFFF アイコン - オフライン表示
├── 同期中状態: #D97706背景 + #FFFFFF スピナー - 同期処理中
├── 同期完了: #16A34A背景 + #FFFFFF チェック - 同期完了
├── 競合警告: #FEF2F2背景 + #DC2626枠線 + #DC2626文字 - 競合通知
├── ストレージ警告: #FFFBEB背景 + #D97706枠線 - ストレージ不足
├── 進捗バー: #E5E7EB背景 + #52525B進捗 - 同期進捗
├── 待機データ数: #6B7280文字 + #E5E7EB背景 - 保留中件数表示
├── 最終同期時刻: #9CA3AF文字 - 最終同期表示
└── 手動同期ボタン: #52525B背景 + #FFFFFF文字 - 手動同期

【エラーハンドリング】
├── ネットワークタイムアウト: 接続失敗時 → 指数バックオフリトライ + ユーザー通知
├── サーバーエラー: API障害時 → ローカル保存継続 + 障害通知
├── ストレージ不足: 容量限界時 → 古いデータ削除提案 + 警告表示
├── データ競合: 同一データ変更時 → 競合解決画面表示 + 選択肢提示
├── 認証エラー: トークン失効時 → 再認証要求 + ローカルデータ保護
└── 復旧処理: 自動復旧（ネットワーク復帰検知） + 手動同期ボタン

【建設現場最適化】
├── 手袋対応: 同期ボタン52pt + 競合解決ボタン48pt以上
├── 視認性: 大きな状態アイコン（32px） + 明確な色分け
├── 耐久性: 低電力モード + データ整合性チェック + 自動バックアップ
└── 騒音対応: 重要な同期完了時のハプティック + 視覚的通知

【使用例】
```tsx
<OfflineSync 
  dataSource="project_data"
  onSyncComplete={(result) => handleSyncResult(result)}
  syncInterval={60000}
  autoSync={true}
  conflictResolution="manual"
  maxOfflineStorage={150}
  onOfflineMode={(isOffline) => setOfflineMode(isOffline)}
  onConflictDetected={(conflicts) => showConflictResolution(conflicts)}
  priorityData={['daily_reports', 'safety_checks']}
/>
```

---

## 🎯 実装ガイドライン

### 共通要件
1. **グレーデザイントークン**: 全コンポーネントで `GrayDesignTokens.ts` を参照
2. **44ptタッチターゲット**: アクセシビリティガイドライン準拠
3. **建設現場対応**: 手袋、騒音、防水・防塵環境での動作保証
4. **オフライン対応**: ネットワーク不安定環境での継続動作
5. **TypeScript完全対応**: 型安全性とコード補完の提供

### テスト要件
- **単体テスト**: 各プロップス、状態変化のテストカバレージ100%
- **統合テスト**: コンポーネント間連携の動作確認
- **アクセシビリティテスト**: スクリーンリーダー、キーボードナビゲーション対応
- **パフォーマンステスト**: 大量データでの動作確認
- **現場テスト**: 実際の建設現場環境でのユーザビリティ検証

### 品質指標
- **応答時間**: 全操作300ms以内
- **可用性**: オフライン時99%動作継続
- **アクセシビリティ**: WCAG 2.1 AA準拠
- **メモリ使用量**: 1コンポーネント当たり5MB以下
- **バッテリー効率**: 通常使用で8時間以上動作

---

**仕様書バージョン**: 1.0  
**最終更新**: 2025年8月11日  
**承認者**: 建設現場UX チーム  
**次回レビュー予定**: 2025年9月11日