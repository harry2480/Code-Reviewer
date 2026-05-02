import { Octokit } from '@octokit/rest';
import type {
	CallerReference,
	ContextExtractorGateway,
	PullRequestContext,
} from '../../domain/gateways/context-extractor.gateway';

const MAX_SYMBOLS = 5;
const MAX_CALLERS_PER_SYMBOL = 3;
const MAX_COMMITS = 5;

export class ContextExtractorAdapter implements ContextExtractorGateway {
	private readonly octokit: Octokit;

	constructor(token: string) {
		this.octokit = new Octokit({ auth: token });
	}

	async extractPullRequestContext(params: {
		owner: string;
		repo: string;
		prNumber: number;
		diff: string;
	}): Promise<PullRequestContext> {
		const { owner, repo, prNumber, diff } = params;

		const [recentCommitMessages, callerReferences] = await Promise.all([
			this.getRecentCommits(owner, repo, prNumber),
			this.extractCallerReferences(owner, repo, diff),
		]);

		return { recentCommitMessages, callerReferences };
	}

	private async getRecentCommits(owner: string, repo: string, prNumber: number): Promise<string[]> {
		const { data } = await this.octokit.pulls.listCommits({
			owner,
			repo,
			pull_number: prNumber,
			per_page: MAX_COMMITS,
		});
		return data.map((commit) => commit.commit.message);
	}

	private async extractCallerReferences(
		owner: string,
		repo: string,
		diff: string,
	): Promise<CallerReference[]> {
		const symbols = this.extractSymbolsFromDiff(diff);
		const changedFiles = this.extractChangedFiles(diff);
		const results: CallerReference[] = [];

		for (const symbol of symbols.slice(0, MAX_SYMBOLS)) {
			try {
				const refs = await this.searchCallSites(owner, repo, symbol, changedFiles);
				results.push(...refs);
			} catch {
				// Rate limit or search failure — skip symbol
			}
		}

		return results;
	}

	private extractSymbolsFromDiff(diff: string): string[] {
		const symbols = new Set<string>();
		const patterns = [
			/^\+.*(?:function|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm,
			/^\+.*(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
		];
		for (const pattern of patterns) {
			let match: RegExpExecArray | null = pattern.exec(diff);
			while (match !== null) {
				symbols.add(match[1]);
				match = pattern.exec(diff);
			}
		}
		return Array.from(symbols);
	}

	private extractChangedFiles(diff: string): string[] {
		const files: string[] = [];
		const regex = /^diff --git a\/(.+?) b\//gm;
		let match: RegExpExecArray | null = regex.exec(diff);
		while (match !== null) {
			files.push(match[1]);
			match = regex.exec(diff);
		}
		return files;
	}

	private async searchCallSites(
		owner: string,
		repo: string,
		symbol: string,
		changedFiles: string[],
	): Promise<CallerReference[]> {
		const { data } = await this.octokit.search.code({
			q: `${symbol} repo:${owner}/${repo}`,
			per_page: MAX_CALLERS_PER_SYMBOL + changedFiles.length,
		});

		const refs: CallerReference[] = [];
		for (const item of data.items) {
			if (changedFiles.includes(item.path)) continue;
			if (refs.length >= MAX_CALLERS_PER_SYMBOL) break;
			refs.push({
				symbol,
				filePath: item.path,
				lineNumber: 1,
				snippet: item.name,
			});
		}
		return refs;
	}
}
