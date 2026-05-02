import { ListReviewSessionsUseCase } from '@/backend/application/usecases/list-review-sessions.usecase';
import type { ReviewSessionRepository } from '@/backend/domain/repositories/review-session.repository';
import { describe, expect, it, vi } from 'vitest';

function createRepo(): ReviewSessionRepository {
	return {
		save: vi.fn(),
		findById: vi.fn(),
		findRecent: vi.fn(),
		findPaginated: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
		countByDateRange: vi.fn(),
	};
}

describe('ListReviewSessionsUseCase', () => {
	it('リポジトリにフィルタとページ情報を渡す', async () => {
		const repo = createRepo();
		const useCase = new ListReviewSessionsUseCase(repo);

		await useCase.execute({
			page: 2,
			perPage: 20,
			language: 'typescript',
			status: 'success',
		});

		expect(repo.findPaginated).toHaveBeenCalledWith({
			page: 2,
			perPage: 20,
			filter: { language: 'typescript', status: 'success' },
		});
	});

	it('page が 0 以下なら 1 に補正する', async () => {
		const repo = createRepo();
		const useCase = new ListReviewSessionsUseCase(repo);

		await useCase.execute({ page: 0, perPage: 20 });

		expect(repo.findPaginated).toHaveBeenCalledWith({
			page: 1,
			perPage: 20,
			filter: { language: undefined, status: undefined },
		});
	});

	it('perPage は最大 100 に丸める', async () => {
		const repo = createRepo();
		const useCase = new ListReviewSessionsUseCase(repo);

		await useCase.execute({ page: 1, perPage: 500 });

		expect(repo.findPaginated).toHaveBeenCalledWith({
			page: 1,
			perPage: 100,
			filter: { language: undefined, status: undefined },
		});
	});
});
