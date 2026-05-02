import { ReviewComment } from '../../domain/models/review-comment.model';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import { prisma } from '../db/prisma-client';

type ReviewCommentRecord = {
	id: string;
	sessionId: string;
	filePath: string;
	lineNumber: number;
	perspective: string;
	severity: string;
	body: string;
	suggestedCode: string | null;
	prNumber: number;
	owner: string;
	repo: string;
	createdAt: Date;
};

function toDomain(record: ReviewCommentRecord): ReviewComment {
	return ReviewComment.reconstruct({
		id: record.id,
		sessionId: record.sessionId,
		filePath: record.filePath,
		lineNumber: record.lineNumber,
		perspective: record.perspective,
		severity: record.severity,
		body: record.body,
		suggestedCode: record.suggestedCode,
		prNumber: record.prNumber,
		owner: record.owner,
		repo: record.repo,
		createdAt: record.createdAt,
	});
}

export class PrismaReviewCommentRepository implements ReviewCommentRepository {
	async save(comment: ReviewComment): Promise<void> {
		await prisma.reviewComment.create({
			data: {
				id: comment.id,
				sessionId: comment.sessionId,
				filePath: comment.filePath,
				lineNumber: comment.lineNumber,
				perspective: comment.perspective,
				severity: comment.severity,
				body: comment.body,
				suggestedCode: comment.suggestedCode,
				prNumber: comment.prNumber,
				owner: comment.owner,
				repo: comment.repo,
				createdAt: comment.createdAt,
			},
		});
	}

	async findByPr(owner: string, repo: string, prNumber: number): Promise<ReviewComment[]> {
		const records = await prisma.reviewComment.findMany({
			where: { owner, repo, prNumber },
			orderBy: { createdAt: 'asc' },
		});

		return records.map(toDomain);
	}

	async findBySessionId(sessionId: string): Promise<ReviewComment[]> {
		const records = await prisma.reviewComment.findMany({
			where: { sessionId },
			orderBy: { createdAt: 'asc' },
		});

		return records.map(toDomain);
	}

	async countByPerspectiveAndDateRange(
		perspective: string,
		start: Date,
		end: Date,
	): Promise<number> {
		return prisma.reviewComment.count({
			where: {
				perspective,
				createdAt: { gte: start, lt: end },
			},
		});
	}
}
