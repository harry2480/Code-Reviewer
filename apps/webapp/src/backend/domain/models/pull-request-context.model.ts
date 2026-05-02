export type CallerReference = {
	symbol: string;
	filePath: string;
	lineNumber: number;
	snippet: string;
};

export type PullRequestContext = {
	recentCommitMessages: string[];
	callerReferences: CallerReference[];
};
