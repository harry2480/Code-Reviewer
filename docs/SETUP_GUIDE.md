# AI-Review-Agent セットアップガイド

GitHub PR の自動 AI レビューエージェントをローカル環境で動かすための手順書です。

---

## 1. 前提条件

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Node.js | 20.x 以上 | `node -v` |
| pnpm | 10.x 以上 | `pnpm -v` |
| Git | 2.40 以上 | `git --version` |
| PostgreSQL | 14 以上（または Supabase / Vercel Postgres） | `psql --version` |

### 必須アカウント (本番運用時)

- **GitHub App**: 自動レビュー対象リポジトリにインストール
- **Anthropic Console**: `ANTHROPIC_API_KEY` 取得
- **Upstash QStash**: 非同期キュー処理
- **Upstash Redis**: トークン消費ログ (任意。未設定時は In-Memory にフォールバック)

---

## 2. クローンと依存インストール

```bash
git clone https://github.com/<your-org>/Code-Reviewer.git
cd Code-Reviewer
pnpm install
```

---

## 3. 環境変数設定

`apps/webapp/.env.local` を作成し、以下を設定します。

### 必須環境変数

```env
# DB
DATABASE_URL="postgresql://user:pass@localhost:5432/code_reviewer"
DIRECT_URL="postgresql://user:pass@localhost:5432/code_reviewer"
```

### AI エンジン (推奨: Anthropic Claude Haiku)

```env
ANTHROPIC_API_KEY="sk-ant-xxxxx"
ANTHROPIC_MODEL="claude-haiku-4-5-20251001"  # オプション。デフォルト: Haiku 4.5
```

未設定の場合は **Stub AI Gateway**（固定応答）にフォールバックします。

### GitHub App 統合 (本番運用時)

```env
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET="<random-32-char-string>"
GITHUB_TOKEN="ghp_xxxxx"  # 開発時用 PAT
```

未設定の場合は **Stub GitHub Adapter**（固定 diff・コメント投稿は no-op）にフォールバックします。

### Upstash (本番運用時)

```env
UPSTASH_QSTASH_URL="https://qstash.upstash.io"
UPSTASH_QSTASH_TOKEN="xxxxx"
UPSTASH_QSTASH_CURRENT_SIGNING_KEY="xxxxx"
UPSTASH_QSTASH_NEXT_SIGNING_KEY="xxxxx"

UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxxx"
```

未設定の場合は **In-Memory** 実装にフォールバックします（テスト/開発用）。

---

## 4. DB マイグレーション

```bash
cd apps/webapp
pnpm prisma generate
pnpm prisma migrate dev --name init
```

開発用シードデータが必要な場合:

```bash
pnpm prisma db seed
```

---

## 5. 開発サーバー起動

```bash
pnpm dev
```

ブラウザで以下にアクセス:

- ダッシュボード: <http://localhost:3000/dashboard>
- レビュー履歴: <http://localhost:3000/review-history>
- 設定: <http://localhost:3000/settings>
- 予算詳細: <http://localhost:3000/settings/budget-details>

---

## 6. GitHub App テスト (ローカル)

ローカルから GitHub Webhook を受け取るため、ngrok 等でトンネリングします。

```bash
ngrok http 3000
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

GitHub App 設定で以下を登録:

- **Webhook URL**: `https://abc123.ngrok.io/api/github/webhook`
- **Webhook secret**: `.env.local` の `GITHUB_WEBHOOK_SECRET` と同じ値
- **Permissions**:
  - Pull requests: Read & write
  - Contents: Read
  - Checks: Read & write
- **Subscribe to events**: `pull_request`, `check_run`

テストレポジトリにインストール → PR 作成 → Webhook 経由で AI レビューが起動します。

---

## 7. 品質チェック・テスト

```bash
# 全品質チェック (lint → typecheck → test → depcruise)
cd apps/webapp
pnpm test:unit            # Unit テスト (Domain + Application)
pnpm test:integration     # Integration テスト (要 INTEGRATION_TEST=true)
pnpm typecheck            # TypeScript 型チェック
pnpm depcruise            # DDD 4層依存ルール検証

# カバレッジレポート
pnpm test:unit --coverage
```

カバレッジ目標:

| 層 | 目標 |
|---|---|
| Domain Models / Services | 80% 以上 |
| Application UseCases | 70% 以上 |
| Infrastructure Adapters | 60% 以上 |

---

## 8. トラブルシューティング

### `Prisma Client did not initialize yet`

`pnpm prisma generate` を実行してください。

### `Daily budget exceeded` エラー

設定ページから日次上限を増額するか、翌日まで待機してください。詳細は `docs/OPERATIONS_GUIDE.md` 参照。

### Webhook 署名検証エラー

`GITHUB_WEBHOOK_SECRET` が GitHub App 設定と一致しているか確認してください。

### Upstash Redis 接続エラー

`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を確認してください。未設定でも In-Memory 実装で動作します（再起動でデータ消失）。

---

## 9. 関連ドキュメント

- [API ドキュメント](./API.md)
- [運用ガイド](./OPERATIONS_GUIDE.md)
- [ユーザーガイド](./USER_GUIDE.md)
- [アーキテクチャ規約](./アーキテクチャ.md)
- [テストガイドライン](./テストガイドライン.md)
