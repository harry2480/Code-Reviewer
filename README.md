# Code-Reviewer

GitHub Pull Request を自動レビューする AI エージェント。4つの観点（Logic、Security、Efficiency、Readability）から多角的なコードレビューを実施し、開発品質を向上させます。

## 機能

### 🎯 4視点統合レビュー

各 PR に対して以下の4つの観点からレビューコメントを自動生成：

- **Logic**: 機能要件の正当性、エッジケース対応、ビジネスロジックの妥当性
- **Security**: セキュリティ脆弱性、認証認可、API キー管理、OWASP Top 10
- **Efficiency**: パフォーマンス改善、N+1 クエリ、メモリリーク、アルゴリズム最適化
- **Readability**: コード可読性、命名規約、型安全性、テスト可能性

### 🌐 言語対応

PR に含まれるファイルの拡張子を自動検出し、言語別の専門知識を動的に注入：

- TypeScript / JavaScript
- Python
- Go
- Rust
- PHP
- Swift

### 💰 予算管理

AI API 呼び出しのコスト管理を統合：

- **トークン消費ログ**: Upstash Redis に時系列記録（7日間保持）
- **ハード制限**: 日次予算上限を超過した場合、自動停止
- **ダッシュボード**: `/settings/budget-details` で消費状況を可視化

### 📊 ダッシュボード

レビュー履歴と統計情報をリアルタイム表示：

- 本日のレビュー件数・AI 消費コスト・トークン数
- 視点別の内訳表示
- 30日間の消費トレンド グラフ

### 🔗 GitHub App 統合

GitHub App として PR Webhook に反応：

- PR 作成時に自動レビュー実行
- Checks API で CI ステータスとして表示
- 非同期キュー（Upstash QStash）でスケーラブルな処理

## 技術スタック

| レイヤー | 技術 |
|---|---|
| **フロントエンド** | Next.js 15 App Router, React 19, shadcn/ui, Tailwind CSS |
| **バックエンド** | TypeScript, Node.js (Vercel Serverless Functions) |
| **データベース** | PostgreSQL (Vercel Postgres), Prisma ORM |
| **AI エンジン** | Anthropic Claude API (prompt caching 有効) |
| **非同期処理** | Upstash QStash |
| **状態管理** | Upstash Redis |
| **認証** | GitHub OAuth 2.0 |
| **品質管理** | Vitest, Biome, dependency-cruiser, TypeScript |

## アーキテクチャ

DDD 4層アーキテクチャで実装：

```
backend/
├── domain/               # ビジネスロジック（外部依存なし）
│   ├── models/          # ドメインモデル
│   ├── services/        # ドメインサービス（PolyglotExpert、ReviewEngine等）
│   ├── gateways/        # 外部依存インターフェース
│   └── repositories/    # データ永続化インターフェース
├── application/         # ユースケース
│   └── usecases/        # ExecutePrReview、ProcessQueue等
├── infrastructure/      # 外部実装
│   ├── adapters/        # Gateway実装（Anthropic、GitHub API等）
│   ├── repositories/    # Repository実装
│   └── db/              # DB接続
└── presentation/        # DI組み立て、API、Server Actions
    ├── composition/     # 依存性注入
    ├── loaders/         # データ読み込み
    └── actions/         # Server Actions
```

## セットアップ

### 前提条件

- Node.js 20+
- pnpm 10+
- Docker（PostgreSQL ローカル開発用）

### インストール

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp apps/webapp/.env.example apps/webapp/.env.local
# 以下を .env.local に設定：
# ANTHROPIC_API_KEY=sk-...
# DATABASE_URL=postgresql://...
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=...
# UPSTASH_QSTASH_URL=https://...
# UPSTASH_QSTASH_TOKEN=...
# GITHUB_OAUTH_CLIENT_ID=...
# GITHUB_OAUTH_CLIENT_SECRET=...
```

### データベース初期化

```bash
pnpm db:migrate  # マイグレーション実行
pnpm db:seed     # サンプルデータ投入（オプション）
```

### 開発サーバー起動

```bash
pnpm dev
```

`http://localhost:3000` で起動します。

## GitHub App 登録

1. GitHub Settings → Developer settings → GitHub Apps → New GitHub App
2. 以下を設定：
   - Webhook URL: `https://your-domain.vercel.app/api/webhooks/github`
   - Webhook secret: 任意
   - Permissions:
     - `pull_requests`: read, write
     - `checks`: read, write
     - `contents`: read
   - Events: `pull_request`

3. Private key を生成し、環境変数に設定

## 開発コマンド

| コマンド | 説明 |
|---|---|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | ビルド |
| `pnpm verify` | 品質チェック実行（lint, typecheck, test, depcruise） |
| `pnpm test:unit` | Unit テスト実行 |
| `pnpm test:integration` | Integration テスト実行 |
| `pnpm lint` | Lint チェック |
| `pnpm lint:fix` | Lint 自動修正 |
| `pnpm typecheck` | TypeScript 型チェック |
| `pnpm knip` | 未使用コード検出 |
| `pnpm db:migrate` | DB マイグレーション |
| `pnpm depcruise` | 依存関係検証（DDD4層構造） |

## テストカバレッジ

Phase 7 完了時点の実装：

| レイヤー | カバレッジ |
|---|---|
| Domain Models | 100% |
| Domain Services | 98.64% |
| Application UseCases | 95.57% |
| Infrastructure Adapters | 87.57% |
| **合計テスト数** | **179 tests** |

## ドキュメント

- [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) — 開発環境セットアップガイド
- [`docs/API.md`](docs/API.md) — Webhook・API エンドポイント仕様
- [`docs/OPERATIONS_GUIDE.md`](docs/OPERATIONS_GUIDE.md) — 運用・監視ガイド
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — エンドユーザー向けガイド（日本語）
- [`AGENTS.md`](AGENTS.md) — AI エージェント向けルール・ガイドライン
- [`docs/アーキテクチャ.md`](docs/アーキテクチャ.md) — DDD4層設計詳細

## ライセンス

MIT

## 開発チーム

- プロジェクト管理: Claude Code
- AI レビューエンジン: Anthropic Claude
