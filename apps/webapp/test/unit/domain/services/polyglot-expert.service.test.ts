import { PolyglotExpertService } from '@/backend/domain/services/polyglot-expert.service';
import { describe, expect, it } from 'vitest';

describe('PolyglotExpertService.detectLanguages', () => {
	const service = new PolyglotExpertService();

	it('単一の TypeScript ファイルから typescript を検出する', () => {
		const diff = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
+const x = 1;`;
		const experts = service.detectLanguages(diff);
		expect(experts).toHaveLength(1);
		expect(experts[0].language).toBe('typescript');
	});

	it('複数言語の混在 diff から各言語を検出する', () => {
		const diff = `diff --git a/src/auth.ts b/src/auth.ts
index aaa..bbb 100644
--- a/src/auth.ts
+++ b/src/auth.ts
diff --git a/api/server.py b/api/server.py
index ccc..ddd 100644
--- a/api/server.py
+++ b/api/server.py
diff --git a/cmd/main.go b/cmd/main.go
index eee..fff 100644
--- a/cmd/main.go
+++ b/cmd/main.go`;
		const experts = service.detectLanguages(diff);
		const langs = experts.map((e) => e.language).sort();
		expect(langs).toEqual(['go', 'python', 'typescript']);
	});

	it('同一言語の重複を排除する（複数 .ts ファイルでも 1 つ）', () => {
		const diff = `diff --git a/src/a.ts b/src/a.ts
diff --git a/src/b.ts b/src/b.ts
diff --git a/src/c.tsx b/src/c.tsx`;
		const experts = service.detectLanguages(diff);
		expect(experts).toHaveLength(1);
		expect(experts[0].language).toBe('typescript');
	});

	it('未対応の拡張子は無視する', () => {
		const diff = `diff --git a/README.md b/README.md
diff --git a/Foo.java b/Foo.java
diff --git a/style.css b/style.css`;
		const experts = service.detectLanguages(diff);
		expect(experts).toHaveLength(0);
	});

	it('対応 + 未対応が混在する場合は対応分のみ返す', () => {
		const diff = `diff --git a/README.md b/README.md
diff --git a/src/main.rs b/src/main.rs
diff --git a/Foo.java b/Foo.java`;
		const experts = service.detectLanguages(diff);
		expect(experts).toHaveLength(1);
		expect(experts[0].language).toBe('rust');
	});

	it('空の diff は空配列を返す', () => {
		const experts = service.detectLanguages('');
		expect(experts).toEqual([]);
	});

	it('diff ヘッダーがない文字列は空配列を返す', () => {
		const experts = service.detectLanguages('just some text\n+ added line');
		expect(experts).toEqual([]);
	});

	it('全 6 言語が検出できる', () => {
		const diff = `diff --git a/a.ts b/a.ts
diff --git a/b.py b/b.py
diff --git a/c.swift b/c.swift
diff --git a/d.php b/d.php
diff --git a/e.go b/e.go
diff --git a/f.rs b/f.rs`;
		const experts = service.detectLanguages(diff);
		const langs = experts.map((e) => e.language).sort();
		expect(langs).toEqual(['go', 'php', 'python', 'rust', 'swift', 'typescript']);
	});
});

describe('PolyglotExpertService.buildLanguageRulesPrompt', () => {
	const service = new PolyglotExpertService();

	it('experts が空配列なら空文字を返す', () => {
		const result = service.buildLanguageRulesPrompt([]);
		expect(result).toBe('');
	});

	it('単一言語のルールセクションが含まれる', () => {
		const experts = service.detectLanguages('diff --git a/src/index.ts b/src/index.ts');
		const result = service.buildLanguageRulesPrompt(experts);
		expect(result).toContain('Language-Specific Rules');
		expect(result).toContain('### typescript');
		expect(result).toContain('strict null checks');
	});

	it('複数言語のセクションが全て含まれる', () => {
		const experts = service.detectLanguages(
			`diff --git a/a.ts b/a.ts
diff --git a/b.py b/b.py`,
		);
		const result = service.buildLanguageRulesPrompt(experts);
		expect(result).toContain('### typescript');
		expect(result).toContain('### python');
		expect(result).toContain('PEP 8');
	});

	it('各ルールが箇条書き形式で出力される', () => {
		const experts = service.detectLanguages('diff --git a/src/main.rs b/src/main.rs');
		const result = service.buildLanguageRulesPrompt(experts);
		expect(result).toMatch(/^- /m);
		expect(result).toContain('Result and Option');
	});
});
