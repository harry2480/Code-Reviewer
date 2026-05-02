import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../domain/models/language-expert.model';
import { ReviewSession } from '../../domain/models/review-session.model';
import type {
	ReviewSessionListFilter,
	ReviewSessionPage,
	ReviewSessionRepository,
} from '../../domain/repositories/review-session.repository';
import { prisma } from '../db/prisma-client';

type ReviewSessionRecord = {
	id: string;
	owner: string;
	repo: string;
	prNumber: number;
	prTitle: string;
	prUrl: string;
	status: string;
	detectedLanguages: string[];
	logicScore: number | null;
	securityScore: number | null;
	efficiencyScore: number | null;
	readabilityScore: number | null;
	totalTokens: number;
	analysisChain: string | null;
	durationMs: number;
	createdAt: Date;
};

function toDomain(record: ReviewSessionRecord): ReviewSession {
	return ReviewSession.reconstruct({
		id: record.id,
		owner: record.owner,
		repo: record.repo,
		prNumber: record.prNumber,
		prTitle: record.prTitle,
		prUrl: record.prUrl,
		status: record.status,
		detectedLanguages: record.detectedLanguages,
		logicScore: record.logicScore,
		securityScore: record.securityScore,
		efficiencyScore: record.efficiencyScore,
		readabilityScore: record.readabilityScore,
		totalTokens: record.totalTokens,
		analysisChain: record.analysisChain,
		durationMs: record.durationMs,
		createdAt: record.createdAt,
	});
}

function buildWhere(filter: ReviewSessionListFilter | undefined): Prisma.ReviewSessionWhereInput {
	const where: Prisma.ReviewSessionWhereInput = {};
	if (filter?.status) {
		where.status = filter.status;
	}
	if (filter?.language) {
		where.detectedLanguages = { has: filter.language as SupportedLanguage };
	}
	return where;
}

export class PrismaReviewSessionRepository implements ReviewSessionRepository {
	async save(session: ReviewSession): Promise<void> {
		await prisma.reviewSession.upsert({
			where: { id: session.id },
			create: {
				id: session.id,
				owner: session.owner,
				repo: session.repo,
				prNumber: session.prNumber,
				prTitle: session.prTitle,
				prUrl: session.prUrl,
				status: session.status,
				detectedLanguages: session.detectedLanguages,
				logicScore: session.logicScore,
				securityScore: session.securityScore,
				efficiencyScore: session.efficiencyScore,
				readabilityScore: session.readabilityScore,
				totalTokens: session.totalTokens,
				analysisChain: session.analysisChain,
				durationMs: session.durationMs,
				createdAt: session.createdAt,
			},
			update: {
				owner: session.owner,
				repo: session.repo,
				prNumber: session.prNumber,
				prTitle: session.prTitle,
				prUrl: session.prUrl,
				status: session.status,
				detectedLanguages: session.detectedLanguages,
				logicScore: session.logicScore,
				securityScore: session.securityScore,
				efficiencyScore: session.efficiencyScore,
				readabilityScore: session.readabilityScore,
				totalTokens: session.totalTokens,
				analysisChain: session.analysisChain,
				durationMs: session.durationMs,
			},
		});
	}

	async findById(id: string): Promise<ReviewSession | null> {
		const record = await prisma.reviewSession.findUnique({ where: { id } });
		if (!record) return null;
		return toDomain(record);
	}

	async findRecent(limit: number): Promise<ReviewSession[]> {
		const records = await prisma.reviewSession.findMany({
			orderBy: { createdAt: 'desc' },
			take: limit,
		});
		return records.map(toDomain);
	}

	async findPaginated(params: {
		page: number;
		perPage: number;
		filter?: ReviewSessionListFilter;
	}): Promise<ReviewSessionPage> {
		const where = buildWhere(params.filter);
		const skip = (params.page - 1) * params.perPage;

		const [records, total] = await Promise.all([
			prisma.reviewSession.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: params.perPage,
			}),
			prisma.reviewSession.count({ where }),
		]);

		return {
			sessions: records.map(toDomain),
			total,
		};
	}

	async countByDateRange(start: Date, end: Date): Promise<number> {
		return prisma.reviewSession.count({
			where: {
				createdAt: { gte: start, lt: end },
			},
		});
	}
}
