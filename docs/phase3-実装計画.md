# Phase 3: PolyglotExpert Service 実装計画

## Context

Phase 2 で実装した「4つの眼」レビューエンジンは、言語に依存しない汎用プロンプトで動作している。Phase 3 では PR diff を解析して使用言語を自動検出し、言語固有のルール（TypeScript strict null checks、Python PEP 8 など）をシステムプロンプトへ動的注入することで、レビューの精度と具体性を向上させる。

**前提条件:** Phase 2 ブランチ（`feature/phase2-core-logic`）が main にマージされていること。

---

## 実装方針

`PolyglotExpertService`（ドメインサービス）を新規作成し、UseCase がこのサービスと既存の`ReviewEngineService`を**オーケストレーション**する設計にする。各サービスの責務を分離する：

- `PolyglotExpertService` → diff から言語を検出し、ルール文字列を生成
- `ReviewEngineService` → 言語ルールを受け取り、システムプロンプトに付加
- `ExecutePrReviewUseCase` → 両サービスを組み合わせてフロー制御

---

## 変更ファイル一覧

### 新規作成

#### 1. `apps/webapp/src/backend/domain/services/polyglot-expert.service.ts`

```typescript
import { LanguageExpert } from '../models/language-expert.model';

export class PolyglotExpertService {
    detectLanguages(diff: string): LanguageExpert[] {
        // "diff --git a/path/to/file.ext b/..." の形式から拡張子を抽出
        // 同じ言語は1つにデデュプリケート
        const regex = /^diff --git a\/(.+?) b\//gm;
        const languageSet = new Map<string, LanguageExpert>();
        let match: RegExpExecArray | null;
        while ((match = regex.exec(diff)) !== null) {
            const ext = match[1].split('.').pop() ?? '';
            const expert = LanguageExpert.fromExtension(ext);
            if (expert && !languageSet.has(expert.language)) {
                languageSet.set(expert.language, expert);
            }
        }
        return Array.from(languageSet.values());
    }

    buildLanguageRulesPrompt(experts: LanguageExpert[]): string {
        if (experts.length === 0) return '';
        const sections = experts.map(e =>
            `### ${e.language}\n${e.rules.map(r => `- ${r}`).join('\n')}`
        );
        return `\n\n## Language-Specific Rules\n${sections.join('\n\n')}`;
    }
}
```

#### 2. `apps/webapp/test/unit/domain/services/polyglot-expert.service.test.ts`

テストケース：
- 単一言語の検出（`.ts` ファイル → `typescript`）
- 複数言語の検出（`.ts` + `.py` → 2 つの `LanguageExpert`）
- 同一言語の重複排除（複数の `.ts` → 1 つの `typescript`）
- 未対応拡張子は無視（`.java`, `.md`）
- 空 diff は空配列
- `buildLanguageRulesPrompt` で experts が空なら空文字
- `buildLanguageRulesPrompt` で言語ルールが含まれること
- 複数言語のルールセクションが全て含まれること

---

### 修正ファイル

#### 3. `apps/webapp/src/backend/domain/services/review-engine.service.ts`

`buildSystemPrompt` にオプショナルの `languageRules` パラメータを追加：

```typescript
// 変更前
buildSystemPrompt(perspective: ReviewPerspective): string {
    return SYSTEM_PROMPTS[perspective];
}

// 変更後
buildSystemPrompt(perspective: ReviewPerspective, languageRules = ''): string {
    return SYSTEM_PROMPTS[perspective] + languageRules;
}
```

#### 4. `apps/webapp/src/backend/application/usecases/execute-pr-review.usecase.ts`

`PolyglotExpertService` をコンストラクタ DI に追加し、diff 取得後に言語検出・プロンプト生成を実行：

```typescript
// コンストラクタ追加
constructor(
    private readonly ai: AiGateway,
    private readonly github: GitHubApiGateway,
    private readonly reviewCommentRepository: ReviewCommentRepository,
    private readonly budgetRepository: BudgetRepository,
    private readonly reviewEngine: ReviewEngineService,
    private readonly polyglotExpert: PolyglotExpertService,  // 追加
) {}

// execute() 内の変更
const [diff, commitMessages] = await Promise.all([...]);

// 追加: 言語検出
const experts = this.polyglotExpert.detectLanguages(diff);
const languageRules = this.polyglotExpert.buildLanguageRulesPrompt(experts);

for (const perspective of PERSPECTIVES) {
    const systemPrompt = this.reviewEngine.buildSystemPrompt(perspective, languageRules); // 変更
    ...
}
```

#### 5. `apps/webapp/src/backend/presentation/composition/review.composition.ts`

```typescript
import { PolyglotExpertService } from '../../domain/services/polyglot-expert.service';

const polyglotExpertService = new PolyglotExpertService();
export const executeReviewUseCase = new ExecutePrReviewUseCase(
    aiGateway,
    gitHubApiGateway,
    reviewCommentRepository,
    budgetRepository,
    reviewEngineService,
    polyglotExpertService,  // 追加
);
```

#### 6. `apps/webapp/test/unit/domain/services/review-engine.service.test.ts`

`buildSystemPrompt` に言語ルールが付加されることを確認するテストを追加：
- `languageRules` なしの場合は基本プロンプトのみ
- `languageRules` ありの場合はプロンプトに付加される

#### 7. `apps/webapp/test/unit/application/usecases/execute-pr-review.usecase.test.ts`

- `createMocks()` に `polyglotExpert: PolyglotExpertService` の実インスタンスを追加
- `vi.spyOn` で `detectLanguages` が diff と共に呼ばれることを検証

---

## 実装順序

1. `polyglot-expert.service.ts` 新規作成
2. `review-engine.service.ts` の `buildSystemPrompt` シグネチャ変更（後方互換あり、デフォルト `''`）
3. `execute-pr-review.usecase.ts` に `PolyglotExpertService` DI 追加
4. `review.composition.ts` 更新
5. `polyglot-expert.service.test.ts` テスト作成
6. 既存テスト（`review-engine.service.test.ts`, `execute-pr-review.usecase.test.ts`）を更新
7. `pnpm verify` で全チェック通過確認

---

## 検証方法

```sh
# 全品質チェック
pnpm verify

# ユニットテストのみ
pnpm test:unit

# 手動確認（Stub モードで）
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{"owner":"octocat","repo":"Hello-World","prNumber":1}'
# → StubGitHubApiAdapter の diff から TypeScript 言語を検出し、
#   レビューコメントが language-specific rules 付きプロンプトで生成されること
```

---

## 影響範囲

| ファイル | 変更種別 | 影響 |
|---|---|---|
| `polyglot-expert.service.ts` | 新規 | なし |
| `review-engine.service.ts` | 修正（後方互換） | `languageRules` がデフォルト `''` のため既存テスト変更不要 |
| `execute-pr-review.usecase.ts` | 修正（DI 追加） | コンストラクタ変更 → composition と test を要更新 |
| `review.composition.ts` | 修正 | DI 追加のみ |
| テスト 3 ファイル | 新規/修正 | Phase 3 の検証 |
