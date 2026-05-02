import { ContextExtractorAdapter } from '@/backend/infrastructure/adapters/context-extractor.adapter';
import { beforeAll, describe, expect, it } from 'vitest';

const INTEGRATION_TEST = process.env.INTEGRATION_TEST === 'true';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

describe.skipIf(!INTEGRATION_TEST || !GITHUB_TOKEN)('ContextExtractorAdapter (integration)', () => {
	let adapter: ContextExtractorAdapter;

	beforeAll(() => {
		adapter = new ContextExtractorAdapter(GITHUB_TOKEN as string);
	});

	it('公開 PR からコミットメッセージを1件以上取得できる', async () => {
		const context = await adapter.extractPullRequestContext({
			owner: 'octocat',
			repo: 'Hello-World',
			prNumber: 1,
			diff: '',
		});

		expect(Array.isArray(context.recentCommitMessages)).toBe(true);
		expect(context.recentCommitMessages.length).toBeGreaterThan(0);
	});

	it('返却される callerReferences は配列で各要素が正しい型を持つ', async () => {
		const sampleDiff = `diff --git a/README b/README
+function greet() {}`;

		const context = await adapter.extractPullRequestContext({
			owner: 'octocat',
			repo: 'Hello-World',
			prNumber: 1,
			diff: sampleDiff,
		});

		expect(Array.isArray(context.callerReferences)).toBe(true);
		for (const ref of context.callerReferences) {
			expect(typeof ref.symbol).toBe('string');
			expect(typeof ref.filePath).toBe('string');
			expect(typeof ref.lineNumber).toBe('number');
			expect(typeof ref.snippet).toBe('string');
		}
	});
});
