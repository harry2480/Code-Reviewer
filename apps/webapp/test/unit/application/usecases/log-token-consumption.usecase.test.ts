import { LogTokenConsumptionUseCase } from '@/backend/application/usecases/log-token-consumption.usecase';
import type { TokenLedgerGateway } from '@/backend/domain/gateways/token-ledger.gateway';
import { Budget } from '@/backend/domain/models/budget.model';
import type { BudgetRepository } from '@/backend/domain/repositories/budget.repository';
import { BudgetManagerService } from '@/backend/domain/services/budget-manager.service';
import { describe, expect, it, vi } from 'vitest';

function setup() {
	const tokenLedger: TokenLedgerGateway = {
		append: vi.fn().mockResolvedValue(undefined),
		listByDate: vi.fn().mockResolvedValue([]),
		summarizeByDate: vi.fn(),
		listRange: vi.fn(),
	};
	const budgetRepository: BudgetRepository = {
		findByDate: vi.fn().mockResolvedValue(null),
		save: vi.fn().mockResolvedValue(undefined),
	};
	const budgetManager = new BudgetManagerService();
	const useCase = new LogTokenConsumptionUseCase(
		tokenLedger,
		budgetRepository,
		budgetManager,
		() => 'gen-id',
	);
	return { tokenLedger, budgetRepository, useCase };
}

describe('LogTokenConsumptionUseCase', () => {
	it('TokenLedger に append し、Budget の usedUsd を加算する', async () => {
		const { tokenLedger, budgetRepository, useCase } = setup();
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		(budgetRepository.findByDate as ReturnType<typeof vi.fn>).mockResolvedValue(
			Budget.reconstruct({ id: 'b1', date: today, dailyLimitUsd: 5, usedUsd: 0.5 }),
		);

		const result = await useCase.execute({
			sessionId: 's1',
			prId: 'org/repo#1',
			model: 'claude-haiku-4-5-20251001',
			perspective: 'logic',
			usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
		});

		expect(result.costUsd).toBeCloseTo(0.0035);
		expect(tokenLedger.append).toHaveBeenCalledOnce();
		const appendArg = (tokenLedger.append as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(appendArg).toMatchObject({
			sessionId: 's1',
			prId: 'org/repo#1',
			model: 'claude-haiku-4-5-20251001',
			perspective: 'logic',
			inputTokens: 1000,
			outputTokens: 500,
			totalTokens: 1500,
		});

		expect(budgetRepository.save).toHaveBeenCalledOnce();
		const savedBudget = (budgetRepository.save as ReturnType<typeof vi.fn>).mock
			.calls[0][0] as Budget;
		expect(savedBudget.usedUsd).toBeCloseTo(0.5 + 0.0035);
		expect(savedBudget.dailyLimitUsd).toBe(5);
	});

	it('Budget が未作成の場合は新規 ID で作成する', async () => {
		const { budgetRepository, useCase } = setup();
		await useCase.execute({
			sessionId: 's1',
			prId: 'org/repo#1',
			model: 'claude-haiku-4-5-20251001',
			perspective: 'logic',
			usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
		});

		expect(budgetRepository.save).toHaveBeenCalledOnce();
		const savedBudget = (budgetRepository.save as ReturnType<typeof vi.fn>).mock
			.calls[0][0] as Budget;
		expect(savedBudget.id).toBe('gen-id');
		expect(savedBudget.usedUsd).toBeCloseTo(0.0035);
	});

	it('stub model はコスト 0 で記録される', async () => {
		const { tokenLedger, useCase } = setup();
		const result = await useCase.execute({
			sessionId: 's1',
			prId: 'org/repo#1',
			model: 'stub',
			perspective: 'logic',
			usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
		});

		expect(result.costUsd).toBe(0);
		const appendArg = (tokenLedger.append as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(appendArg.costUsd).toBe(0);
	});
});
