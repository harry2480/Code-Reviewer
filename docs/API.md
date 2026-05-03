# AI-Review-Agent API ドキュメント

Hono ルーター + Vercel Serverless Functions による REST API 仕様。
ベースパス: `/api`

---

## 認証

| エンドポイント | 認証方式 |
|---|---|
| `POST /api/github/webhook` | GitHub Webhook 署名 (`x-hub-signature-256`) |
| `POST /api/github/webhook/process` | Upstash QStash 署名 (`upstash-signature`) |
| `POST /api/review` | （現状未実装の保護機構。本番では認証ミドルウェア追加予定） |

---

## エンドポイント一覧

### `POST /api/github/webhook`

GitHub Webhook を受信する。`pull_request` / `check_run` 等のイベントを処理し、QStash にレビュータスクをキューする。

#### リクエストヘッダ

| ヘッダ | 型 | 必須 | 説明 |
|---|---|---|---|
| `x-hub-signature-256` | string | ✅ | HMAC-SHA256 署名 (`sha256=...`) |
| `x-github-event` | string | ✅ | イベント型 (`pull_request`, `check_run` など) |
| `content-type` | string | ✅ | `application/json` |

#### リクエストボディ

GitHub Webhook ペイロード (公式仕様準拠)。

```json
{
  "action": "opened",
  "pull_request": {
    "number": 42,
    "head": { "sha": "abc123..." }
  },
  "repository": {
    "owner": { "login": "acme" },
    "name": "my-app"
  }
}
```

#### レスポンス

**202 Accepted** (受理):

```json
{
  "queued": true,
  "checkRunId": 99999
}
```

**400 Bad Request** (JSON パースエラー):

```json
{ "error": "Invalid JSON payload" }
```

**401 Unauthorized** (署名検証失敗):

```json
{ "error": "INVALID_SIGNATURE" }
```

**500 Internal Server Error** (その他):

```json
{ "error": "INTERNAL_ERROR" }
```

---

### `POST /api/github/webhook/process`

Upstash QStash から呼び出される非同期レビュー処理エンドポイント。
クライアントから直接呼び出してはならない。

#### リクエストヘッダ

| ヘッダ | 型 | 必須 | 説明 |
|---|---|---|---|
| `upstash-signature` | string | ✅ | QStash 署名 |

#### リクエストボディ

```json
{
  "owner": "acme",
  "repo": "my-app",
  "prNumber": 42,
  "headSha": "abc123...",
  "checkRunId": 99999
}
```

#### レスポンス

- `200 OK`: `{ "success": true }`
- `400`: `{ "error": "Invalid JSON payload" }`
- `401`: `{ "error": "INVALID_SIGNATURE" }`
- `500`: `{ "error": "REVIEW_FAILED" | "INVALID_MESSAGE" }`

---

### `POST /api/review`

PR レビューを手動でトリガする (テスト用)。

#### リクエストボディ

```json
{
  "owner": "acme",
  "repo": "my-app",
  "prNumber": 42
}
```

#### レスポンス

- `200 OK`: `{ "success": true }`
- `500`: `{ "error": "<message>" }`
  - 予算超過時: `"Daily budget exceeded: 5.0001 USD / 5.00 USD"`

---

## エラーレスポンス共通

| エラーコード | HTTP | 意味 |
|---|---|---|
| `INVALID_SIGNATURE` | 401 | Webhook / QStash 署名検証失敗 |
| `INVALID_MESSAGE` | 500 | キューメッセージ形式不正 |
| `REVIEW_FAILED` | 500 | AI レビュー実行失敗 (詳細はログ参照) |

---

## レビュー視点とスコア

各 PR は **「4つの眼」** で評価され、それぞれ JSON 配列でコメントが返される。

| 視点 (perspective) | 観点 |
|---|---|
| `logic` | 境界値・例外処理・破壊的変更・論理誤り |
| `security` | シークレット露出・SQLi/XSS・認証バイパス |
| `efficiency` | 計算量・冗長な処理・キャッシュ戦略 |
| `readability` | 命名・SOLID・コード明瞭性 |

各コメントの構造:

```ts
{
  filePath: string,
  lineNumber: number,  // 1-based
  perspective: "logic" | "security" | "efficiency" | "readability",
  severity: "info" | "warning" | "critical",
  body: string,
  suggestedCode: string | null
}
```

---

## レート制限

現状はアプリケーションレベルでのレート制限なし。
予算管理機能 (`Budget.dailyLimitUsd`) によるハードリミットが実質的なレート制御。

| 制限項目 | 値 | 備考 |
|---|---|---|
| 日次トークン消費上限 | デフォルト $5.00 | 設定ページから変更可 |
| QStash リトライ | 3 回 (指数バックオフ) | UpstashQStashAdapter で設定 |
| Vercel 関数タイムアウト | 60 秒 | Webhook 処理は非同期化で回避 |

---

## 関連ドキュメント

- [セットアップガイド](./SETUP_GUIDE.md)
- [運用ガイド](./OPERATIONS_GUIDE.md)
- [アーキテクチャ規約](./アーキテクチャ.md)
