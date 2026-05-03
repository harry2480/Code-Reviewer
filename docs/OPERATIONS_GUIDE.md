# AI-Review-Agent 運用ガイド

本番環境での監視、トラブルシューティング、スケーリングのガイドラインです。

---

## モニタリング

### 1. Vercel ログ

```bash
vercel logs --follow         # リアルタイムログ
vercel logs --since=1h       # 直近1時間のログ
```

確認ポイント:

- AI Gateway 呼び出しエラー (Anthropic API レート制限・503)
- Webhook 受信 → QStash キュー成功率
- 予算超過警告 (`Budget exceeded mid-review`)

### 2. Upstash QStash モニタリング

[Upstash Console](https://console.upstash.com/) → QStash → Messages

確認ポイント:

- キュー深度 (溜まっている = 処理が追いついていない)
- リトライ回数 (3 回失敗 = Dead Letter Queue 行き)
- 平均処理時間

### 3. Upstash Redis モニタリング

```bash
# トークン消費ログ確認
redis-cli LRANGE token-ledger:2026-05-03 0 -1
```

または webapp 内 `/settings/budget-details` ページで GUI 確認。

### 4. GitHub Checks API ステータス分布

PR 画面で「AI Review」ステータス:

- ⏳ `In Progress`: キュー処理中
- ✅ `Completed (success)`: レビュー成功
- ❌ `Completed (failure)`: AI/GitHub API エラー
- ⚪ `Completed (neutral)`: 予算超過でスキップ

---

## トラブルシューティング

| 症状 | 原因の候補 | 対応 |
|---|---|---|
| PR にコメント投稿されない | GitHub App 権限不足 | App 設定で `Pull requests: Read & write` 確認 |
| Webhook が届かない | URL 不正 / Secret 不一致 | Vercel ドメイン・Webhook secret 確認 |
| 「Daily budget exceeded」が連発 | 上限が低すぎ / トークン爆発 | 設定ページから日次上限を増額 (例: $5 → $10) |
| AI レスポンス遅延 | QStash キュー溜まり | キュー深度監視。並列ワーカ数を Upstash Pro で増やす |
| `NO_JSON_ARRAY_FOUND` 連発 | プロンプトが不適切 | システムプロンプト見直し (src/backend/domain/services/review-engine.service.ts) |
| Redis 接続エラー | URL/Token 不正 | Upstash Console で Token を再生成 |
| Prisma migration 失敗 | DB バージョン不一致 | `pnpm prisma migrate reset` (開発環境のみ) |

### 詳細: 予算超過 (`BudgetExceededError`)

予算超過時の動作:

1. ExecutePrReviewUseCase で予算チェックに失敗 → `BudgetExceededError` を throw
2. ProcessReviewQueueUseCase が catch し、Checks API を `conclusion: neutral` で更新
3. PR 画面に「AI Review skipped: Budget Exceeded」と表示

復旧手順:

```bash
# 1. 予算ダッシュボードで本日の使用量を確認
# /settings/budget-details

# 2. 上限を増額
# /settings → 予算管理 → 日次上限を変更 → Submit

# 3. 既存 PR を再レビューしたい場合は GitHub App から手動再起動
# または PR を closed → reopened にして webhook を再送信
```

---

## ログ解析

### Vercel ログ抽出

```bash
# Anthropic API エラーのみ抽出
vercel logs | grep -E "(Anthropic|429|503)"

# 予算超過ログのみ
vercel logs | grep "Budget exceeded"

# 視点別失敗率
vercel logs | grep "Failed to parse" | awk '{print $5}' | sort | uniq -c
```

### Redis トークン消費ログ CSV エクスポート

webapp の `/settings/budget-details` ページから「CSV エクスポート」ボタンで本日のログをダウンロード可能。

---

## スケーリング検討

### Anthropic API レート制限

Anthropic Tier 別レート制限 (2026 年時点目安):

| Tier | RPM | TPM (Haiku) |
|---|---|---|
| Tier 1 | 50 | 50,000 |
| Tier 2 | 1,000 | 100,000 |
| Tier 3 | 2,000 | 200,000 |

PR レビュー 1 件 = 4 視点 = 4 リクエスト + 約 10K トークン入力。
Tier 1 で約 12 PR/min が処理上限。超える場合は Tier アップグレード。

### Upstash QStash プラン

- **Free**: 500 メッセージ/日
- **Pay as you go**: $1 / 100K メッセージ

PR レビュー 1 件 = 1 メッセージ。月 1,000 PR でも Free プラン圏内。

### Vercel Function タイムアウト

| プラン | Timeout |
|---|---|
| Hobby | 10 秒 |
| Pro | 60 秒 |
| Enterprise | 900 秒 |

レビュー処理は QStash 経由で非同期化しており、Webhook 受信は数百ms で完了するため、Hobby プランでも問題なし。

### PostgreSQL コネクション

Vercel Serverless では関数ごとに新規接続が発生する。
Prisma Connection Pool の設定:

```env
# Vercel Postgres / Supabase 推奨
DATABASE_URL="postgresql://...?connection_limit=1&pool_timeout=20"
```

接続数枯渇時は Supabase Pooler (port 6543) を使用。

---

## バックアップ・復旧

### DB バックアップ

- Supabase: 自動日次バックアップ (Pro プラン)
- Vercel Postgres: 自動日次バックアップ
- 手動: `pg_dump` で SQL 出力

### Redis データ復旧

トークン消費ログは TTL 7 日。永続性が必要な場合:
- 重要ログは Postgres に二重書き込み (要実装)
- 月次レポートは事前にエクスポート

---

## セキュリティ

### Webhook 署名検証

- `GITHUB_WEBHOOK_SECRET` は **必ず** 32 文字以上のランダム文字列
- 漏洩した場合は GitHub App 設定 → Webhook secret を即時更新

### API キー管理

- `ANTHROPIC_API_KEY` などは Vercel 環境変数 (Encrypted) で管理
- `.env.local` は `.gitignore` 必須
- 漏洩時は Anthropic Console から API キー失効

### 監査ログ

- レビューコメント投稿は GitHub の標準監査ログに残る
- トークン消費ログ (Redis) は監査用途では使用不可 (TTL 7 日)
- 必要なら Postgres に永続化レイヤー追加

---

## 関連ドキュメント

- [セットアップガイド](./SETUP_GUIDE.md)
- [API ドキュメント](./API.md)
- [ユーザーガイド](./USER_GUIDE.md)
