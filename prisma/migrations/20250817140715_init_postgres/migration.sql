-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."District" AS ENUM ('名古屋千種地区', '名古屋西部地区', '名古屋北斗地区', '名古屋巽地区', '尾張西地区', '尾張東地区', '尾張南地区', '知多北部地区', '知多東地区', '知多西南地区', '豊田地区', '三河葵地区', '碧海地区', '穂の国地区', 'その他地区');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('RADIO', 'CHECKBOX', 'TEXT', 'SCALE', 'RATING');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "public"."ConferenceRound" (
    "id" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heroUrl" TEXT,
    "intro" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConferenceRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "troop" TEXT NOT NULL,
    "rsAge" INTEGER NOT NULL,
    "district" "public"."District" NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailQueue" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "meetingCode" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "meetingCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MeetingSheet" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reiwa" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "via" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Poll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3),

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "type" "public"."QuestionType" NOT NULL,
    "title" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "helpText" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Choice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FireScore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FireScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Submission" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Answer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choiceId" TEXT,
    "text" TEXT,
    "scaleValue" INTEGER,
    "ratingValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnswerChoice" (
    "answerId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,

    CONSTRAINT "AnswerChoice_pkey" PRIMARY KEY ("answerId","choiceId")
);

-- CreateIndex
CREATE INDEX "ConferenceRound_fy_round_idx" ON "public"."ConferenceRound"("fy", "round");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceRound_fy_round_key" ON "public"."ConferenceRound"("fy", "round");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "public"."Participant"("email");

-- CreateIndex
CREATE INDEX "EmailQueue_status_queuedAt_idx" ON "public"."EmailQueue"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "EmailQueue_participantId_meetingCode_idx" ON "public"."EmailQueue"("participantId", "meetingCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_key" ON "public"."EmailToken"("token");

-- CreateIndex
CREATE INDEX "EmailToken_participantId_meetingCode_idx" ON "public"."EmailToken"("participantId", "meetingCode");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSheet_key_key" ON "public"."MeetingSheet"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_code_key" ON "public"."Meeting"("code");

-- CreateIndex
CREATE INDEX "Meeting_reiwa_seq_idx" ON "public"."Meeting"("reiwa", "seq");

-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "public"."Meeting"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_reiwa_seq_key" ON "public"."Meeting"("reiwa", "seq");

-- CreateIndex
CREATE INDEX "Attendance_meetingId_checkedAt_idx" ON "public"."Attendance"("meetingId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_meetingId_participantId_key" ON "public"."Attendance"("meetingId", "participantId");

-- CreateIndex
CREATE INDEX "Poll_createdAt_idx" ON "public"."Poll"("createdAt");

-- CreateIndex
CREATE INDEX "Question_pollId_index_idx" ON "public"."Question"("pollId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Question_pollId_index_key" ON "public"."Question"("pollId", "index");

-- CreateIndex
CREATE INDEX "Choice_questionId_index_idx" ON "public"."Choice"("questionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Choice_questionId_index_key" ON "public"."Choice"("questionId", "index");

-- CreateIndex
CREATE INDEX "FireScore_score_createdAt_idx" ON "public"."FireScore"("score", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_pollId_createdAt_idx" ON "public"."Submission"("pollId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_pollId_fingerprint_key" ON "public"."Submission"("pollId", "fingerprint");

-- CreateIndex
CREATE INDEX "Answer_submissionId_questionId_idx" ON "public"."Answer"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "Answer_choiceId_idx" ON "public"."Answer"("choiceId");

-- AddForeignKey
ALTER TABLE "public"."EmailQueue" ADD CONSTRAINT "EmailQueue_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailToken" ADD CONSTRAINT "EmailToken_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Choice" ADD CONSTRAINT "Choice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "public"."Choice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnswerChoice" ADD CONSTRAINT "AnswerChoice_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "public"."Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnswerChoice" ADD CONSTRAINT "AnswerChoice_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "public"."Choice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
