# AI-Review-Agent AIエージェントへの指針 (AGENTS.md)

このファイルは、AI-Review-Agent リポジトリでコードを操作する際のAIエージェントへのルールおよび指針を提供します。

**プロジェクト概要**: GitHub Pull Request (PR) において、熟練エンジニアの視点を持つAIが自動レビューを行うGitHub App。Vercel Serverless Functions での運用を前提に、多言語エキスパート・プロンプト、CI同期、自己修正、およびAIエージェント連携機能を備える。

## 必須ルール

### Worktree必須
コード変更を伴う作業は、**必ず git worktree を作成してから開始すること**。メインのリポジトリディレクトリでは直接コード変更を行わない。

```bash
# 1. worktreeを作成
git worktree add ../ar-<branch-name> -b <branch-name>

# 2. 環境や権限定義のコピー
cp .env ../ar-<branch-name>/
```

- **目的**: main/develop ブランチを常にクリーンに保ち、作業の分離と並列作業を容易にする
- **例外なし**: ドキュメントのみの変更も含め、すべてのコミットで worktree を使用すること

### DDD 4層アーキテクチャの遵守
バックエンド実装は必ず DDD 4層構造を守ること。依存方向は常に外層 → 内層。

```
presentation → application → domain ← infrastructure
```

- **domain**: ビジネスルール。外部依存なし。Rich Domain Model 必須。
- **application**: UseCase。domain のみ依存（infrastructure は Gateway interface 経由）。
- **infrastructure**: Gateway/Repository 実装。domain の interface を implements。
- **presentation**: DI 組み立て（唯一の組み立てポイント）、loaders（読み取り）、actions（副作用）。

### ファイル命名規約
- ドメインモデル: `{name}.model.ts`
- ドメインサービス: `{name}.service.ts`
- Gateway/Repository interface: `{name}.gateway.ts` / `{name}.repository.ts`
- UseCase: `{name}.usecase.ts`
- Gateway/Repository 実装: `{name}.adapter.ts` / `{name}.repository.ts`
- Composition（DI）: `{name}.composition.ts`
- Loader（読み取り）: `{name}.loader.ts`
- Action（副作用）: `{name}.action.ts` （`'use server'` マーク必須）

### エラーハンドリング
- **Domain 層**: `Result<T, E>` 型で返す（throw 禁止）。
- **Application/Infrastructure**: throw 可。
- **外部 API の Gateway**: 必ず Stub 実装を用意し、composition で環境変数に応じて切り替え。

### API ルート回避
- API Route 原則不使用（Next.js）。loaders + Server Actions パターンを使用。
- GraphQL, REST エンドポイント実装が必要な場合は、Hono ルーターで実装。

### ポリグロット・エキスパート・モジュール
PR 内の拡張子を判定し、以下の言語固有のルールを注入するプロンプト設計を厳守。

- **TypeScript**: 型定義の厳密性、非効率な `any` 使用、非 null assertion の禁止。
- **Python**: PEP 8 準拠、非効率なリスト内包表記、非同期処理の不備。
- **Swift**: 強制アンラップ禁止、メモリ管理（ARC）の考慮。
- **PHP**: 型宣言の徹底、8.x の最新構文活用。
- **Go**: エラーハンドリング徹底、goroutine リーク防止。
- **Rust**: 所有権と借用の最適化、不要な `.clone()` の指摘。

詳細は `src/prompts/` ディレクトリ内の言語別エキスパートプロンプトを参照。

### 予算管理・レート制限
- **ハードリミット**: 1日のトークン消費上限（例: 0.5 USD）を超えた場合、自動で処理を停止。
- **GitHub API 監視**: API 残量を監視し、指数バックオフによるリクエスト制御。
- **Upstash Redis**: コスト集計・学習データ保存用。

## 作業ルール

### コード変更前の確認
`pnpm verify` を実行し、全てパスすることを確認してからコード変更を開始。

```bash
pnpm verify  # lint → prisma generate → typecheck → unit test → depcruise
```

### テスト戦略
- **Unit Test**: domain + application（Gateway はモック、外部依存なし）。
- **Integration Test**: infrastructure（`INTEGRATION_TEST=true` + `DATABASE_URL` が未設定ならスキップ）。
- テストパス: `test/unit/`、`test/integration/`（ソース構造を mirror）。

### 実装計画・ドキュメント
要件定義・実装計画が必要な場合は、最初に論点を洗い出し、requirements.md または設計ドキュメントを作成してからコード実装を開始。

### GitHub Issue作成
- プラン内容を簡略化せず、そのままissueに記載する
- コード例、型定義などの詳細な実装内容を含める
- 検証方法を具体的に記載する

### PR レビューの品質確保
- **Analysis Chain**: `<details>` タグ内に詳細な推論プロセス（CoT）を格納し、ユーザーが背景理解できるよう配慮。
- **Instruction Block**: レビューコメント末尾に、Cursor や Claude Code に貼り付けて一括修正を指示できるプロンプトを自動生成。
- **Suggested Changes**: GitHub 上で即時適用可能なコードスニペットを提供。

### Push前の必須チェック
`git push` する前に、以下のコマンドを必ず実行し、全てパスすることを確認する：

1. `pnpm lint:fix` - 自動フォーマット
2. `pnpm typecheck` - TypeScript 型チェック
3. `pnpm test:unit` - ユニットテスト
4. `pnpm depcruise` - 依存関係の検証（DDD 4層構造）

いずれかが失敗した場合は修正してからpushすること。

## 開発コマンド

```bash
pnpm dev               # 開発サーバー起動
pnpm verify            # 全品質チェック
pnpm test:unit         # Unit テスト
pnpm test:integration  # Integration テスト（要 DATABASE_URL, INTEGRATION_TEST=true）
pnpm lint:fix          # 自動フォーマット
pnpm db:migrate        # DBマイグレーション
pnpm knip              # 未使用コード検出
```

## アーキテクチャ

**設計思想**: DDD 4層構造 + ポリグロット・エキスパート・プロンプト動的注入

**主要技術スタック**:
- **Runtime**: Hono / Node.js (Vercel Serverless Functions)
- **非同期キュー**: Upstash QStash
- **状態管理**: Upstash Redis
- **AIエンジン**: Gemini 3.0 / OpenRouter (Adapter パターン)
- **フロントエンド**: Next.js 15 App Router (apps/webapp/)
- **フロントエンド UI**: shadcn/ui + Tailwind CSS

## ディレクトリ構造

```text
src/backend/
├── domain/
│   ├── models/          # ドメインモデル (.model.ts)
│   ├── services/        # ドメインサービス (.service.ts)
│   ├── gateways/        # Gateway interface (.gateway.ts)
│   └── repositories/    # Repository interface (.repository.ts)
├── application/
│   └── usecases/        # UseCase (.usecase.ts)
├── infrastructure/
│   ├── adapters/        # Gateway 実装 (.adapter.ts) — 本番 + Stub
│   ├── repositories/    # Repository 実装 (.repository.ts)
│   └── db/              # DB接続 (prisma-client.ts)
└── presentation/
    ├── composition/     # DI 組み立て (.composition.ts)
    ├── loaders/         # データ取得 (.loader.ts)
    └── actions/         # 副作用 (.action.ts, 'use server')

src/prompts/
├── core/                # 共通プロンプト
├── polyglot/            # 言語別エキスパートプロンプト
│   ├── typescript.ts
│   ├── python.ts
│   ├── swift.ts
│   ├── php.ts
│   ├── go.ts
│   └── rust.ts
└── instructions/        # レビューコメント生成テンプレート

apps/webapp/
├── app/                 # Next.js App Router
├── components/          # UI コンポーネント
└── lib/                 # 共有ライブラリ
```
