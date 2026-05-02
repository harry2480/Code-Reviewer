import { GetReviewSessionDetailUseCase } from '@/backend/application/usecases/get-review-session-detail.usecase';
import { ReviewSession } from '@/backend/domain/models/review-session.model';
import type { ReviewCommentRepository } from '@/backend/domain/repositories/review-comment.repository';
import type { ReviewSessionRepository } from '@/backend/domain/repositories/review-session.repository';
import { describe, expect, it, vi } from 'vitest';

function buildSession(id: string): ReviewSession {
	const r = ReviewSession.create({
		id,
		owner: 'acme',
		repo: 'app',
		prNumber: 1,
		prTitle: 'PR',
		prUrl: 'https://github.com/acme/app/pull/1',
		status: 'success',
		detectedLanguages: ['typescript'],
	});
	if (!r.success) throw new Error('build session failed');
	return r.value;
}

function createMocks() {
	const reviewSessionRepository: ReviewSessionRepository = {
		save: vi.fn(),
		findById: vi.fn().mockResolvedValue(null),
		findRecent: vi.fn(),
		findPaginated: vi.fn(),
		countByDateRange: vi.fn(),
	};
	const reviewCommentRepository: ReviewCommentRepository = {
		save: vi.fn(),
		findByPr: vi.fn(),
		findBySessionId: vi.fn().mockResolvedValue([]),
		countByPerspectiveAndDateRange: vi.fn(),
	};
	return { reviewSessionRepository, reviewCommentRepository };
}

describe('GetReviewSessionDetailUseCase', () => {
	it('存在する session を comments と一緒に返す', async () => {
		const mocks = createMocks();
		const session = buildSession('s1');
		(mocks.reviewSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(session);

		const useCase = new GetReviewSessionDetailUseCase(
			mocks.reviewSessionRepository,
			mocks.reviewCommentRepository,
		);

		const result = await useCase.execute('s1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.session.id).toBe('s1');
			expect(result.value.comments).toEqual([]);
		}
		expect(mocks.reviewCommentRepository.findBySessionId).toHaveBeenCalledWith('s1');
	});

	it('存在しない id の場合 NOT_FOUND を返す', async () => {
		const mocks = createMocks();
		const useCase = new GetReviewSessionDetailUseCase(
			mocks.reviewSessionRepository,
			mocks.reviewCommentRepository,
		);

		const result = await useCase.execute('missing');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('NOT_FOUND');
		}
		expect(mocks.reviewCommentRepository.findBySessionId).not.toHaveBeenCalled();
	});
});
