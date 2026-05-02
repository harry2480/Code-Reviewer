import { ReviewComment } from '../../domain/models/review-comment.model';
import type { ReviewCommentRepository } from '../../domain/repositories/review-comment.repository';
import { prisma } from '../db/prisma-client';

export class PrismaReviewCommentRepository implements ReviewCommentRepository {
	async save(comment: ReviewComment): Promise<void> {
		await prisma.reviewComment.create({
			data: {
				id: comment.id,
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

		return records.map((record) =>
			ReviewComment.reconstruct({
				id: record.id,
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
			}),
		);
	}
}
