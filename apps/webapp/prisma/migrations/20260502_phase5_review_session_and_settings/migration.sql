-- CreateTable
CREATE TABLE "review_sessions" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "pr_number" INTEGER NOT NULL,
    "pr_title" TEXT NOT NULL,
    "pr_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detected_languages" TEXT[],
    "logic_score" INTEGER,
    "security_score" INTEGER,
    "efficiency_score" INTEGER,
    "readability_score" INTEGER,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "analysis_chain" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_sessions_created_at_idx" ON "review_sessions"("created_at");

-- AlterTable
ALTER TABLE "review_comments" ADD COLUMN "session_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "review_comments_session_id_idx" ON "review_comments"("session_id");

-- AddForeignKey
ALTER TABLE "review_comments"
    ADD CONSTRAINT "review_comments_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "review_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "language_rule_settings" (
    "language" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "language_rule_settings_pkey" PRIMARY KEY ("language")
);
