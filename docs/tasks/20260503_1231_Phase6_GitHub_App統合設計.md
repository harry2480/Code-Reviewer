# Phase 6: GitHub App 統合設計書

## 目的

**GitHub Webhook を受け取り、非同期キュー経由で AI レビューを実行し、結果を PR 画面に表示できるようにするため。**

具体的には：
- PR 作成・更新イベントを自動検知
- レビュー実行を非同期化（Vercel timeout 対策）
- Checks API で進捗と結果を PR 画面に表示
- レビューコメントを GitHub に投稿

---

## 概要

Phase 5 までで実装済み：
- ✅ Domain モデル（ReviewComment, ReviewSession, LanguageRuleSetting）
- ✅ Application UseCase（ExecutePrReviewUseCase, GetDashboardStatsUseCase など）
- ✅ AI Gateway + Adapter（Gemini, Stub）
- ✅ フロントエンド（ダッシュボード・レビュー履歴・設定）

Phase 6 で新規実装：
- ⬜ Hono Webhook エンドポイント（GitHub Event 受信）
- ⬜ ペイロード署名検証（HMAC）
- ⬜ Upstash QStash Adapter + 非同期キュー処理
- ⬜ Checks API Integration（進捗・結果表示）
- ⬜ GitHub API でのレビューコメント投稿
- ⬜ イベントハンドラのオーケストレーション
- ⬜ Webhook / QStash ハンドラの Unit & Integration テスト

---

## 構成図

```
GitHub PR 操作
    ↓
[GitHub Webhook] ← Webhook Secret で署名
    ↓
[Vercel /api/github/webhook endpoint] (Hono)
    ├─ ① ペイロード署名検証
    ├─ ② イベント型判定 (pull_request / check_run / pull_request_review)
    ├─ ③ Checks API で「In Progress」表示
    └─ ④ QStash にメッセージキュー
         ↓
[Upstash QStash Message]
    ↓
[Vercel /api/github/webhook/process endpoint]
    ├─ ① QStash 署名検証
    ├─ ② ExecutePrReviewUseCase 実行
    │  └─ AI レビュー実行（ReviewComment 生成）
    ├─ ③ GitHub API でレビューコメント投稿
    └─ ④ Checks API で「Completed」表示
         ↓
GitHub PR 画面に「AI Review: ✅ Completed」表示
+ レビューコメント投稿完了
```

---

## 実装スコープ

### 6.1 Webhook ハンドリング

#### エンドポイント設計

**受信エンドポイント** (`POST /api/github/webhook`)
- GitHub から Webhook を受け取る
- ペイロード署名を検証（HMAC SHA-256）
- イベント型を判定
- QStash にメッセージキュー

**処理エンドポイント** (`POST /api/github/webhook/process`)
- QStash から起動される
- ExecutePrReviewUseCase でレビュー実行
- GitHub API でコメント投稿
- Checks API で完了報告

#### 署名検証ロジック

```typescript
// 署名方式: HMAC-SHA256
// ヘッダー: X-Hub-Signature-256: sha256=<hex-encoded-signature>

function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = 'sha256=' + hmacSha256(payload, secret);
  return timingSafeEqual(expected, signature);
}
```

#### イベント型判定

受け取る Webhook イベント：

| イベント | 条件 | アクション |
|---|---|---|
| `pull_request` | action: "opened" / "synchronize" | PR レビュー実行 |
| `check_run` | status: "completed", conclusion: "success" | PR レビュー実行（CI Success 確認後） |
| `pull_request_review` | action: "submitted" | 不要なら無視 |

### 6.2 非同期キュー（Upstash QStash）

#### QStash メッセージ仕様

```typescript
interface QStashMessage {
  // GitHub イベントペイロード
  githubEvent: 'pull_request' | 'check_run';
  
  // PR 情報
  prNumber: number;
  owner: string;
  repo: string;
  
  // PR 差分・メタデータ（ペイロードから抽出）
  title: string;
  body: string;
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  
  // Head commit SHA（Checks API 更新に必要）
  headSha: string;
  
  // Installation ID（GitHub API 認証に必要）
  installationId: number;
}
```

#### キューイング処理

```typescript
async function enqueueReview(message: QStashMessage): Promise<void> {
  const client = new Client({
    token: process.env.UPSTASH_QSTASH_TOKEN,
  });
  
  await client.publishJSON({
    topic: 'github-review',
    body: message,
    retries: 3,  // 最大 3 回リトライ
    delay: 0,    // 即座に実行開始
  });
}
```

#### リトライ・タイムアウト戦略

- **リトライ**: 指数バックオフ。最大 3 回
- **タイムアウト**: 5 分以内に処理完了。超過時は自動停止・ログ記録

### 6.3 Checks API 統合

#### Checks API 仕様

GitHub の Checks API で PR 画面に「AI Review」チェックを表示。

```typescript
interface CheckRun {
  name: 'AI Review';
  head_sha: string;  // Webhook の head_sha
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'skipped' | 'timed_out';
  output?: {
    title: string;
    summary: string;
    text?: string;
  };
}
```

#### ライフサイクル

1. **Webhook 受信直後** → Check Create (status: queued)
2. **キュー投入直後** → Check Update (status: in_progress)
3. **レビュー完了直後** → Check Update (status: completed, conclusion: success)
4. **エラー発生時** → Check Update (status: completed, conclusion: failure)

### 6.4 レビューコメント投稿

#### 投稿フロー

1. ExecutePrReviewUseCase でレビュー実行 → ReviewComment[] 取得
2. GitHub API `/repos/{owner}/{repo}/issues/{issue_number}/comments` でコメント投稿
3. Suggested Changes フォーマット（optional）
4. Instruction Block 生成・挿入（optional）

#### コメント形式

**Basic レビューコメント**:
```markdown
## AI Review - Readability

**Score**: 7/10

**Findings**:
- 変数名が略語だけだと可読性が低下しています
- 関数が長く、単一責任の原則を逸脱しています

**Suggestion**:
変数 `usr` → `currentUser`, 関数を 3 つに分割してください。
```

**Suggested Changes フォーマット** (optional):
```markdown
## AI Review - Logic

**Suggestion**:
```suggestion
// 修正後のコード例
if (value !== null && value !== undefined) {
  process(value);
}
```
```

#### Instruction Block（Cursor/Claude Code 統合）

```markdown
## AI Review - Action Required

以下は Cursor / Claude Code 向けの自動修正指示です：

<cursor:instruction>
// ここに Cursor Instruction Format の指示を記述
</cursor:instruction>
```

### 6.5 テスト戦略

#### Unit テスト対象

- ✅ 署名検証ロジック
- ✅ イベント型判定ロジック
- ✅ QStash メッセージ構築
- ✅ Checks API ペイロード構築
- ✅ GitHub コメント形式生成

#### Integration テスト対象

- ✅ Webhook エンドポイント → QStash へのキュー成功
- ✅ QStash メッセージ処理 → ExecutePrReviewUseCase 呼び出し
- ✅ GitHub Stub API との連携（コメント投稿確認）
- ✅ Checks API Update 確認

---

## 必要な環境変数

以下は Phase 6 に必須の環境変数です。既存の Phase 1-5 環境変数に加えて必要：

### GitHub Webhook 署名検証

```env
GITHUB_WEBHOOK_SECRET=<Random 32+ char string>
```

**取得方法**:
1. GitHub App 設定画面で新規作成
2. ランダム文字列を生成して保存
3. Vercel 環境変数に設定

### Upstash QStash

```env
UPSTASH_QSTASH_URL=https://qstash.upstash.io
UPSTASH_QSTASH_TOKEN=<Your Upstash QStash Token>
```

**取得方法**:
1. https://console.upstash.com に新規登録
2. QStash プロジェクト作成
3. トークンを確認・コピー

### GitHub App 認証（既存）

```env
GITHUB_APP_ID=<Your GitHub App ID>
GITHUB_APP_PRIVATE_KEY=<Private Key PEM format>
```

これらは Phase 1 で既に設定済みの想定。

---

## ドメイン・アプリケーション層への追加

### Domain 層

**新規 Gateway**: `domain/gateways/checks-api.gateway.ts`
```typescript
export interface ChecksApiGateway {
  createCheckRun(params: CreateCheckRunParams): Promise<CheckRun>;
  updateCheckRun(params: UpdateCheckRunParams): Promise<CheckRun>;
}
```

**新規 Gateway**: `domain/gateways/github-webhook.gateway.ts`
```typescript
export interface GitHubWebhookGateway {
  verifySignature(payload: string, signature: string): Promise<boolean>;
}
```

### Application 層

**新規 UseCase**: `application/usecases/handle-github-webhook.usecase.ts`
```typescript
export class HandleGitHubWebhookUseCase {
  async execute(payload: GitHubWebhookPayload): Promise<Result<void, WebhookError>> {
    // 1. ペイロード検証
    // 2. イベント型判定
    // 3. Checks API で In Progress 表示
    // 4. QStash にキュー
  }
}
```

**新規 UseCase**: `application/usecases/process-review-queue.usecase.ts`
```typescript
export class ProcessReviewQueueUseCase {
  async execute(message: QStashMessage): Promise<Result<void, QueueError>> {
    // 1. ExecutePrReviewUseCase 呼び出し
    // 2. GitHub API でコメント投稿
    // 3. Checks API で Completed 表示
  }
}
```

---

## インフラ層への追加

### Adapter 実装

**新規**: `infrastructure/adapters/github-webhook.adapter.ts`
```typescript
export class GitHubWebhookAdapter implements GitHubWebhookGateway {
  async verifySignature(payload: string, signature: string): Promise<boolean> {
    // HMAC-SHA256 検証ロジック
  }
}
```

**新規**: `infrastructure/adapters/checks-api.adapter.ts`
```typescript
export class ChecksApiAdapter implements ChecksApiGateway {
  async createCheckRun(params: CreateCheckRunParams): Promise<CheckRun> {
    // GitHub App Authentication + REST API 呼び出し
  }
  
  async updateCheckRun(params: UpdateCheckRunParams): Promise<CheckRun> {
    // GitHub App Authentication + REST API 呼び出し
  }
}
```

**新規**: `infrastructure/adapters/upstash-qstash.adapter.ts`
```typescript
export class UpstashQStashAdapter implements QueueServiceGateway {
  async enqueue(message: QStashMessage): Promise<void> {
    // Upstash SDK で メッセージキュー
  }
}
```

---

## Presentation 層への追加

### Hono ルーター設定

**新規**: `presentation/actions/handle-github-webhook.action.ts`
```typescript
// Hono ルーター定義
export const webhookRouter = new Hono();

webhookRouter.post('/webhook', async (c) => {
  // 1. ペイロード取得
  // 2. 署名検証
  // 3. HandleGitHubWebhookUseCase 実行
  // 4. QStash にキュー
  // 5. HTTP 202 Accepted 返却
});

webhookRouter.post('/webhook/process', async (c) => {
  // 1. QStash 署名検証（X-QStash-Signature）
  // 2. ProcessReviewQueueUseCase 実行
  // 3. HTTP 200 OK 返却
});
```

### Composition Root への追加

```typescript
// presentation/composition/review-webhook.composition.ts
export class ReviewWebhookComposition {
  static createHandleWebhookUseCase(): HandleGitHubWebhookUseCase {
    const webhookGateway = new GitHubWebhookAdapter(process.env.GITHUB_WEBHOOK_SECRET);
    const checksApiGateway = new ChecksApiAdapter(...);
    const queueGateway = new UpstashQStashAdapter(...);
    
    return new HandleGitHubWebhookUseCase(
      webhookGateway,
      checksApiGateway,
      queueGateway
    );
  }
  
  static createProcessQueueUseCase(): ProcessReviewQueueUseCase {
    const executePrReviewUseCase = ReviewComposition.createExecutePrReviewUseCase();
    const githubApiGateway = new GitHubRestApiAdapter(...);
    const checksApiGateway = new ChecksApiAdapter(...);
    
    return new ProcessReviewQueueUseCase(
      executePrReviewUseCase,
      githubApiGateway,
      checksApiGateway
    );
  }
}
```

---

## 実装順序（依存関係）

```
Phase 6 実装順序：

1. Domain 層 Gateway インターフェース定義
   ├─ checks-api.gateway.ts
   ├─ github-webhook.gateway.ts
   └─ queue-service.gateway.ts (既存: domain/gateways に追加)

2. Application 層 UseCase 実装
   ├─ handle-github-webhook.usecase.ts + Unit tests
   └─ process-review-queue.usecase.ts + Unit tests

3. Infrastructure 層 Adapter 実装
   ├─ github-webhook.adapter.ts + Unit tests
   ├─ checks-api.adapter.ts + Unit tests
   └─ upstash-qstash.adapter.ts + Unit tests

4. Presentation 層実装
   ├─ composition/review-webhook.composition.ts
   ├─ actions/handle-github-webhook.action.ts
   ├─ Hono ルーター設定 (src/backend/presentation/routes)
   └─ Integration tests

5. メインアプリに Webhook ルーター統合
   ├─ src/index.ts に webhookRouter マウント
   └─ End-to-end テスト
```

---

## テスト戦略

### Unit テスト

#### 署名検証テスト
- ✅ 正しい署名で検証成功
- ✅ 間違う署名で検証失敗
- ✅ タイミング攻撃対策（timingSafeEqual）

#### イベント判定テスト
- ✅ pull_request opened → レビュー実行
- ✅ pull_request synchronize → レビュー実行
- ✅ check_run success → レビュー実行
- ✅ check_run failure → スキップ

#### Checks API ペイロード生成テスト
- ✅ Create → status: queued
- ✅ Update → status: in_progress
- ✅ Update → status: completed, conclusion: success

#### QStash メッセージ生成テスト
- ✅ GitHub ペイロード → QStash メッセージ変換
- ✅ 必須フィールドの検証

### Integration テスト

#### Stub GitHub API での統合テスト
- ✅ Webhook エンドポイント → QStash へのキュー成功
- ✅ QStash メッセージ処理 → レビューコメント投稿確認
- ✅ Checks API Update 確認

#### E2E テスト（将来予定）
- ⬜ 実 GitHub リポジトリでの Webhook テスト

---

## 実装の注意点

### セキュリティ

1. **Webhook 署名検証は必須**
   - 全 Webhook ペイロードの署名を検証
   - 署名検証失敗は HTTP 401 返却

2. **QStash 署名検証**
   - Upstash → Vercel への呼び出しも署名検証
   - `X-QStash-Signature` ヘッダーを確認

3. **GitHub App Private Key の保護**
   - 環境変数で安全に管理
   - ログに出力しない

### パフォーマンス

1. **Webhook は即座に 202 Accepted を返す**
   - レビュー処理は QStash で非同期実行
   - Vercel 10 秒 timeout を超過しない

2. **Duplicate Prevention**
   - 同じ PR + 同じ Commit SHA なら、既存レビュー再利用
   - Redis キャッシュ活用（実装は Phase 7 で検討）

### エラーハンドリング

1. **ネットワークエラー**
   - QStash リトライ（最大 3 回）
   - 失敗後はログ記録 + Slack 通知（設定予定）

2. **レビュー実行エラー**
   - Checks API で `conclusion: failure` 表示
   - エラー詳細を GitHub に投稿

3. **予算超過**
   - レビュー実行前に予算確認
   - 超過時は `conclusion: skipped` 表示

---

## 整合性チェック

### アーキテクチャルール確認

✅ **依存方向**: presentation → application → domain ← infrastructure
- Webhook Action は application/UseCase 経由で domain アクセス
- Infrastructure adapter は domain Gateway を implements

✅ **DDD 4 層**
- Domain: Gateway interface 定義
- Application: UseCase で ビジネスロジック（署名検証→キュー）
- Infrastructure: Adapter で GitHub / Upstash 実装
- Presentation: Hono ルーター + Composition Root

✅ **エラーハンドリング**
- Domain / Application: `Result<T, E>` で返却
- Infrastructure: エラーは throw （adapter がリトライ実装）
- Presentation: 例外を catch し HTTP ステータス返却

✅ **テスト戦略**
- Unit: Domain / Application UseCase の業ロジック
- Integration: Stub Gateway で エンドツーエンド検証
- E2E: 将来予定（Phase 7）

---

## 今後の検討事項

以下は Phase 6 スコープ外だが、将来的に実装予定：

- **Duplicate Prevention**: Redis キャッシュで重複レビュー防止
- **Webhook イベントのフィルタリング**: GitHub App 設定で受け取るイベント制限
- **Checks API 出力の詳細化**: 詳細レビュー結果を output フィールドに記載
- **通知**: レビュー完了時にユーザーに Slack / Email 通知
- **レビューコメント更新**: 同じ PR の複数レビュー実行時にコメント更新機能

---

## 完了定義

Phase 6 実装完了時点で以下を確認：

- [ ] Domain 層: ChecksApiGateway, GitHubWebhookGateway, QueueServiceGateway 定義
- [ ] Application 層: HandleGitHubWebhookUseCase, ProcessReviewQueueUseCase 実装 + tests
- [ ] Infrastructure 層: 3 つの Adapter 実装 + tests
- [ ] Presentation 層: Webhook ルーター + Composition Root 実装 + tests
- [ ] 全 Unit テスト成功（Unit テスト目標 80% カバレッジ達成）
- [ ] Integration テスト成功（Stub API 使用）
- [ ] TypeScript 型チェック成功（tsc --noEmit）
- [ ] Biome Linter 成功（pnpm lint）
