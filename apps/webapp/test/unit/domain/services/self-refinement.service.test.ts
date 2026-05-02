import type { AiGateway } from '@/backend/domain/gateways/ai.gateway';
import { ReviewComment } from '@/backend/domain/models/review-comment.model';
import { SelfRefinementService } from '@/backend/domain/services/self-refinement.service';
import { describe, expect, it, vi } from 'vitest';

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
+const x = 1;`;

function makeComment(id: string): ReviewComment {
	const result = ReviewComment.create({
		id,
		filePath: 'src/index.ts',
		lineNumber: 1,
		perspective: 'logic',
		severity: 'info',
		body: `Issue ${id}`,
		suggestedCode: null,
		prNumber: 1,
		owner: 'org',
		repo: 'repo',
	});
	if (!result.success) throw new Error('Failed to create test comment');
	return result.value;
}

function makeAi(response: string): AiGateway {
	return { generate: vi.fn().mockResolvedValue(response) };
}

describe('SelfRefinementService', () => {
	describe('#refine', () => {
		it('候補が0件のとき AI を呼ばず空の outcome を返す', async () => {
			const ai: AiGateway = { generate: vi.fn() };
			const service = new SelfRefinementService(ai);

			const outcome = await service.refine({ diff: SAMPLE_DIFF, candidateComments: [] });

			expect(outcome.acceptedComments).toEqual([]);
			expect(outcome.rejectedComments).toEqual([]);
			expect(ai.generate).not.toHaveBeenCalled();
		});

		it('AI が全件 accept を返した場合、全コメントが acceptedComments に入る', async () => {
			const c1 = makeComment('id-1');
			const c2 = makeComment('id-2');
			const aiResponse = JSON.stringify([
				{ id: 'id-1', verdict: 'accept', reason: 'ok' },
				{ id: 'id-2', verdict: 'accept', reason: 'ok' },
			]);
			const service = new SelfRefinementService(makeAi(aiResponse));

			const outcome = await service.refine({ diff: SAMPLE_DIFF, candidateComments: [c1, c2] });

			expect(outcome.acceptedComments).toHaveLength(2);
			expect(outcome.rejectedComments).toHaveLength(0);
		});

		it('一部 reject された場合、rejectedComments に reason が保持される', async () => {
			const c1 = makeComment('id-1');
			const c2 = makeComment('id-2');
			const aiResponse = JSON.stringify([
				{ id: 'id-1', verdict: 'accept', reason: 'ok' },
				{ id: 'id-2', verdict: 'reject', reason: 'hallucination: line not in diff' },
			]);
			const service = new SelfRefinementService(makeAi(aiResponse));

			const outcome = await service.refine({ diff: SAMPLE_DIFF, candidateComments: [c1, c2] });

			expect(outcome.acceptedComments).toHaveLength(1);
			expect(outcome.acceptedComments[0].id).toBe('id-1');
			expect(outcome.rejectedComments).toHaveLength(1);
			expect(outcome.rejectedComments[0].comment.id).toBe('id-2');
			expect(outcome.rejectedComments[0].reason).toBe('hallucination: line not in diff');
		});

		it('AI レスポンスが JSON パース失敗のとき fail-open で全件 accept', async () => {
			const c1 = makeComment('id-1');
			const service = new SelfRefinementService(makeAi('not valid json'));

			const outcome = await service.refine({ diff: SAMPLE_DIFF, candidateComments: [c1] });

			expect(outcome.acceptedComments).toHaveLength(1);
			expect(outcome.rejectedComments).toHaveLength(0);
		});

		it('verdict 一覧に id が存在しないコメントは accept 扱いにする', async () => {
			const c1 = makeComment('id-1');
			const c2 = makeComment('id-2');
			const aiResponse = JSON.stringify([
				{ id: 'id-1', verdict: 'reject', reason: 'grounding issue' },
				// id-2 は verdict 一覧に含まれていない
			]);
			const service = new SelfRefinementService(makeAi(aiResponse));

			const outcome = await service.refine({ diff: SAMPLE_DIFF, candidateComments: [c1, c2] });

			expect(outcome.acceptedComments.map((c) => c.id)).toContain('id-2');
			expect(outcome.rejectedComments.map(({ comment }) => comment.id)).toContain('id-1');
		});

		it('AI generate が例外を throw した場合、上位に伝播する', async () => {
			const c1 = makeComment('id-1');
			const ai: AiGateway = { generate: vi.fn().mockRejectedValue(new Error('AI down')) };
			const service = new SelfRefinementService(ai);

			await expect(service.refine({ diff: SAMPLE_DIFF, candidateComments: [c1] })).rejects.toThrow(
				'AI down',
			);
		});

		it('AI を 1 回だけ呼ぶ（perspective ごとに分割しない）', async () => {
			const comments = ['id-1', 'id-2', 'id-3'].map(makeComment);
			const aiResponse = JSON.stringify(
				comments.map((c) => ({ id: c.id, verdict: 'accept', reason: 'ok' })),
			);
			const ai = makeAi(aiResponse);
			const service = new SelfRefinementService(ai);

			await service.refine({ diff: SAMPLE_DIFF, candidateComments: comments });

			expect(ai.generate).toHaveBeenCalledTimes(1);
		});
	});
});
