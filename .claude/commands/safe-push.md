# /safe-push

安全なgit pushを実行します。pushする前に差分をユーザーに確認します。

## このコマンドが実行すること

1. `git log origin/main..HEAD` でpush予定のcommitを表示
2. `git diff origin/main..HEAD --stat` で変更ファイルの一覧を表示
3. ユーザーに確認を求める
4. ユーザーが「OKです」または「push して大丈夫です」と承認したら push を実行

## 実行コマンド

```
git push origin main
```

## 注意

- `--force` は絶対に使わない
- mainブランチへの force push は禁止
- ユーザーの明示的な「OKです」が必要

## 承認フレーズ

以下のいずれかでpushを承認とみなします:
- 「OKです」
- 「push して大丈夫です」
- 「push してください」
