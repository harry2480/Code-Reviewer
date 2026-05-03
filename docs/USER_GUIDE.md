# AI-Review-Agent ユーザーガイド

GitHub PR を AI に自動レビューしてもらうエージェントの使い方ガイド。

---

## 1. AI-Review-Agent とは

GitHub Pull Request に対して、以下の **「4つの眼」** で AI が自動的にレビューコメントを投稿します。

| 視点 | 何を見るか |
|---|---|
| 🔍 **ロジック** | 境界値・例外処理・論理誤り |
| 🔒 **セキュリティ** | シークレット露出・SQLi/XSS・認証バイパス |
| ⚡ **効率性** | 計算量・キャッシュ戦略 |
| 📖 **可読性** | 命名規則・SOLID 原則 |

加えて、6 言語 (TypeScript / Python / Swift / PHP / Go / Rust) の言語別ルールも自動的に適用されます。

---

## 2. GitHub App インストール

### 手順

1. [GitHub App ページ](https://github.com/apps/<your-app-name>) を開く
2. **Install** をクリック
3. レビュー対象のリポジトリを選択
   - 全リポジトリ: `All repositories`
   - 特定のみ: `Only select repositories`
4. **Install** で確定

### 必要な権限

| 種別 | アクセス | 用途 |
|---|---|---|
| Pull requests | Read & write | レビューコメント投稿 |
| Contents | Read | PR 差分・ファイル取得 |
| Checks | Read & write | レビュー進捗表示 |
| Webhook events | `pull_request`, `check_run` | レビュートリガ |

---

## 3. レビュー実行フロー

### 自動実行

PR を作成・更新すると、自動的にレビューが起動します。

```
1. PR 作成
2. ⏳ AI Review: In Progress (PR 画面の Checks タブ)
3. AI が 4 視点 + 言語別ルールで解析
4. ✅ AI Review: Completed → コメント投稿完了
```

### コメント形式

PR の対象行に以下のようなコメントが投稿されます:

> ⚠️ **[security]** 環境変数 `API_KEY` がハードコードされています。`.env` から読み込むよう変更してください。
>
> ```suggestion
> const apiKey = process.env.API_KEY;
> ```

`suggestion` ブロックは GitHub の **Suggested Changes** で 1 クリック適用可能。

---

## 4. ダッシュボード

`https://<your-domain>/dashboard` で以下を確認:

- 本日のレビュー数
- 本日のセキュリティ検出数
- 本日の予算消費 (USD)
- GitHub App 接続状態
- 直近のレビューセッション一覧

---

## 5. レビュー履歴

`https://<your-domain>/review-history` で過去のレビューを確認:

- 言語フィルタ (TypeScript / Python など)
- ステータスフィルタ (Success / Failed / Skipped)
- ページネーション
- 各セッションの詳細 (4 視点スコア、コメント本文、Analysis Chain)

---

## 6. 設定

`https://<your-domain>/settings` で以下を変更可能:

### GitHub App 接続状態

`GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` の設定状況を表示。

### 言語別ルール ON/OFF

各言語のレビューを個別に有効/無効化できます。

| 言語 | デフォルト |
|---|---|
| TypeScript | ON |
| Python | ON |
| Swift | ON |
| PHP | ON |
| Go | ON |
| Rust | ON |

### 予算管理

日次トークン消費の上限を設定 (USD)。デフォルト $5.00。
**詳細レポートを見る** から `/settings/budget-details` に遷移可能。

---

## 7. 予算詳細ページ

`https://<your-domain>/settings/budget-details` で以下を確認:

- 本日の合計コスト・トークン・呼び出し回数
- 視点別の内訳
- 過去 30 日間のグラフ
- 本日のトークン消費ログ (CSV エクスポート対応)
- 上限接近・超過アラート

---

## 8. よくある質問 (FAQ)

### Q. レビューにかかる時間は?

A. 通常 30 秒〜 2 分。PR の差分サイズと AI レート制限に依存します。

### Q. 予算超過時の挙動は?

A. PR の Checks に **「AI Review skipped: Budget Exceeded」** と表示され、コメントは投稿されません。
設定ページから上限を増額すると、次の PR から再開します。

### Q. 過去の PR を再レビューしたい

A. PR を Close → Reopen で webhook が再送信され、再レビューされます。

### Q. AI のレビューが間違っている場合は?

A. GitHub PR コメントに `Resolve` または絵文字で意思表示できます。
学習データとして集約する仕組みは将来実装予定。

### Q. 個別ファイルを除外したい

A. 現状は GitHub App 全体での ON/OFF のみ。今後 `.review-ignore` のようなファイル単位除外を検討中。

### Q. プライベートリポジトリでも動作する?

A. はい。GitHub App をプライベートリポジトリにインストールすれば動作します。
ソースコードは Anthropic API へ送信されますが、Anthropic は学習用には使用しないと明記されています ([Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy))。

### Q. コストが心配

A. デフォルトで日次 $5.00 のハードリミットがあり、超過時は自動停止します。
Claude Haiku 4.5 を使う場合、PR 1 件あたり約 $0.005 〜 $0.02 が目安です。

---

## 9. サポート

- バグ報告: <https://github.com/<your-org>/Code-Reviewer/issues>
- 機能要望: 同上
- ドキュメント: [docs/](./)

---

## 関連ドキュメント

- [セットアップガイド](./SETUP_GUIDE.md)
- [API ドキュメント](./API.md)
- [運用ガイド](./OPERATIONS_GUIDE.md)
