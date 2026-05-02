import { GetDashboardStatsUseCase } from '@/backend/application/usecases/get-dashboard-stats.usecase';
import { Budget } from '@/backend/domain/models/budget.model';
import { ReviewSession } from '@/backend/domain/models/review-session.model';
import type { BudgetRepository } from '@/backend/domain/repositories/budget.repository';
import type { ReviewCommentRepository } from '@/backend/domain/repositories/review-comment.repository';
import type { ReviewSessionRepository } from '@/backend/domain/repositories/review-session.repository';
import { describe, expect, it, vi } from 'vitest';

function buildSession(id: string): ReviewSession {
	const result = ReviewSession.create({
		id,
		owner: 'acme',
		repo: 'app',
		prNumber: 1,
		prTitle: `PR ${id}`,
		prUrl: `https://github.com/acme/app/pull/${id}`,
		status: 'success',
		detectedLanguages: ['typescript'],
	});
	if (!result.success) throw new Error('failed to build session in test');
	return result.value;
}

function createMocks() {
	const reviewSessionRepository: ReviewSessionRepository = {
		save: vi.fn(),
		findById: vi.fn(),
		findRecent: vi.fn().mockResolvedValue([]),
		findPaginated: vi.fn(),
		countByDateRange: vi.fn().mockResolvedValue(0),
	};
	const reviewCommentRepository: ReviewCommentRepository = {
		save: vi.fn(),
		findByPr: vi.fn(),
		findBySessionId: vi.fn(),
		countByPerspectiveAndDateRange: vi.fn().mockResolvedValue(0),
	};
	const budgetRepository: BudgetRepository = {
		findByDate: vi.fn().mockResolvedValue(null),
		save: vi.fn(),
	};
	return { reviewSessionRepository, reviewCommentRepository, budgetRepository };
}

describe('GetDashboardStatsUseCase', () => {
	const now = new Date('2026-05-02T12:34:56Z');

	it('全 Repository から集約してダッシュボード統計を返す', async () => {
		const mocks = createMocks();
		(mocks.reviewSessionRepository.countByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue(
			7,
		);
		(
			mocks.reviewCommentRepository.countByPerspectiveAndDateRange as ReturnType<typeof vi.fn>
		).mockResolvedValue(3);
		const budget = Budget.create({
			id: 'b1',
			date: now,
			dailyLimitUsd: 0.5,
			usedUsd: 0.1,
		});
		if (!budget.success) throw new Error('failed budget');
		(mocks.budgetRepository.findByDate as ReturnType<typeof vi.fn>).mockResolvedValue(budget.value);
		const sessions = [buildSession('s1'), buildSession('s2')];
		(mocks.reviewSessionRepository.findRecent as ReturnType<typeof vi.fn>).mockResolvedValue(
			sessions,
		);

		const useCase = new GetDashboardStatsUseCase(
			mocks.reviewSessionRepository,
			mocks.reviewCommentRepository,
			mocks.budgetRepository,
		);

		const result = await useCase.execute({ now, githubAppConnected: true });

		expect(result.connectivity.githubAppConnected).toBe(true);
		expect(result.todayReviewCount).toBe(7);
		expect(result.todaySecurityFindings).toBe(3);
		expect(result.budget?.dailyLimitUsd).toBe(0.5);
		expect(result.recentSessions).toHaveLength(2);
	});

	it('Budget が未作成の日は budget=null で返す', async () => {
		const mocks = createMocks();
		const useCase = new GetDashboardStatsUseCase(
			mocks.reviewSessionRepository,
			mocks.reviewCommentRepository,
			mocks.budgetRepository,
		);

		const result = await useCase.execute({ now, githubAppConnected: false });

		expect(result.budget).toBeNull();
		expect(result.connectivity.githubAppConnected).toBe(false);
	});

	it('countByDateRange を「その日 00:00 ～ 翌日 00:00」の範囲で呼ぶ', async () => {
		const mocks = createMocks();
		const useCase = new GetDashboardStatsUseCase(
			mocks.reviewSessionRepository,
			mocks.reviewCommentRepository,
			mocks.budgetRepository,
		);

		await useCase.execute({ now, githubAppConnected: true });

		const call = (mocks.reviewSessionRepository.countByDateRange as ReturnType<typeof vi.fn>).mock
			.calls[0];
		const [start, end] = call as [Date, Date];
		expect(start.toISOString()).toBe('2026-05-02T00:00:00.000Z');
		expect(end.toISOString()).toBe('2026-05-03T00:00:00.000Z');
	});
});
