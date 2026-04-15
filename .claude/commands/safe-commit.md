# /safe-commit

安全なgit commitを実行します。`settings.local.json` を含まないことを確認してからcommitします。

## このコマンドが実行すること

1. `git status` で変更ファイルを確認
2. `.claude/settings.local.json` が含まれていないことを確認
3. `git diff --staged` で差分を表示してユーザーに確認を求める
4. ユーザーが承認したら commit を作成

## commit メッセージ規則

```
feat: phase1 ui - [コンポーネント名]
feat: phase2 logic - [機能名]
fix: [修正内容]
refactor: [リファクタ内容]
docs: [ドキュメント内容]
```

## 含めてはいけないファイル

- `.claude/settings.local.json` (APIキー等を含む可能性)
- `.env` 系ファイル
- `node_modules/`

## 注意

- このコマンドはcommitのみ実施します。pushは `/safe-push` を使ってください
- 承認なしにpushしません
