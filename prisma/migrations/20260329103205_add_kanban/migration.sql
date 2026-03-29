-- CreateTable
CREATE TABLE "public"."KanbanBoard" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "background" JSONB NOT NULL DEFAULT '{"type":"gradient","value":"linear-gradient(135deg, #1e293b 0%, #334155 100%)"}',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanBoardMember" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanBoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanColumn" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanCard" (
    "id" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'none',
    "dueDate" TIMESTAMP(3),
    "coverColor" TEXT,
    "coverImageUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanLabel" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "KanbanLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanCardLabel" (
    "cardId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "KanbanCardLabel_pkey" PRIMARY KEY ("cardId","labelId")
);

-- CreateTable
CREATE TABLE "public"."KanbanCardAssignment" (
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanCardAssignment_pkey" PRIMARY KEY ("cardId","userId")
);

-- CreateTable
CREATE TABLE "public"."KanbanChecklist" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanComment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanAttachment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanActivity" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanMention" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "mentionType" TEXT NOT NULL,
    "mentionTargetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KanbanNotification" (
    "id" TEXT NOT NULL,
    "boardId" TEXT,
    "cardId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanBoard_ownerId_idx" ON "public"."KanbanBoard"("ownerId");

-- CreateIndex
CREATE INDEX "KanbanBoardMember_boardId_idx" ON "public"."KanbanBoardMember"("boardId");

-- CreateIndex
CREATE INDEX "KanbanBoardMember_userId_idx" ON "public"."KanbanBoardMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanBoardMember_boardId_userId_key" ON "public"."KanbanBoardMember"("boardId", "userId");

-- CreateIndex
CREATE INDEX "KanbanColumn_boardId_idx" ON "public"."KanbanColumn"("boardId");

-- CreateIndex
CREATE INDEX "KanbanCard_columnId_idx" ON "public"."KanbanCard"("columnId");

-- CreateIndex
CREATE INDEX "KanbanCard_createdById_idx" ON "public"."KanbanCard"("createdById");

-- CreateIndex
CREATE INDEX "KanbanCard_dueDate_idx" ON "public"."KanbanCard"("dueDate");

-- CreateIndex
CREATE INDEX "KanbanLabel_boardId_idx" ON "public"."KanbanLabel"("boardId");

-- CreateIndex
CREATE INDEX "KanbanCardAssignment_userId_idx" ON "public"."KanbanCardAssignment"("userId");

-- CreateIndex
CREATE INDEX "KanbanChecklist_cardId_idx" ON "public"."KanbanChecklist"("cardId");

-- CreateIndex
CREATE INDEX "KanbanChecklistItem_checklistId_idx" ON "public"."KanbanChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "KanbanComment_cardId_idx" ON "public"."KanbanComment"("cardId");

-- CreateIndex
CREATE INDEX "KanbanComment_authorId_idx" ON "public"."KanbanComment"("authorId");

-- CreateIndex
CREATE INDEX "KanbanAttachment_cardId_idx" ON "public"."KanbanAttachment"("cardId");

-- CreateIndex
CREATE INDEX "KanbanActivity_cardId_idx" ON "public"."KanbanActivity"("cardId");

-- CreateIndex
CREATE INDEX "KanbanActivity_createdAt_idx" ON "public"."KanbanActivity"("createdAt");

-- CreateIndex
CREATE INDEX "KanbanMention_cardId_idx" ON "public"."KanbanMention"("cardId");

-- CreateIndex
CREATE INDEX "KanbanMention_mentionTargetId_idx" ON "public"."KanbanMention"("mentionTargetId");

-- CreateIndex
CREATE INDEX "KanbanNotification_userId_isRead_idx" ON "public"."KanbanNotification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "KanbanNotification_createdAt_idx" ON "public"."KanbanNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."KanbanBoard" ADD CONSTRAINT "KanbanBoard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanBoardMember" ADD CONSTRAINT "KanbanBoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."KanbanBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanBoardMember" ADD CONSTRAINT "KanbanBoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanColumn" ADD CONSTRAINT "KanbanColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."KanbanBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanCard" ADD CONSTRAINT "KanbanCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "public"."KanbanColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanCard" ADD CONSTRAINT "KanbanCard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanLabel" ADD CONSTRAINT "KanbanLabel_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."KanbanBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanCardLabel" ADD CONSTRAINT "KanbanCardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanCardLabel" ADD CONSTRAINT "KanbanCardLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "public"."KanbanLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanCardAssignment" ADD CONSTRAINT "KanbanCardAssignment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanCardAssignment" ADD CONSTRAINT "KanbanCardAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanChecklist" ADD CONSTRAINT "KanbanChecklist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanChecklistItem" ADD CONSTRAINT "KanbanChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."KanbanChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanComment" ADD CONSTRAINT "KanbanComment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanComment" ADD CONSTRAINT "KanbanComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanAttachment" ADD CONSTRAINT "KanbanAttachment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanAttachment" ADD CONSTRAINT "KanbanAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanActivity" ADD CONSTRAINT "KanbanActivity_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanActivity" ADD CONSTRAINT "KanbanActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanMention" ADD CONSTRAINT "KanbanMention_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanNotification" ADD CONSTRAINT "KanbanNotification_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."KanbanBoard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KanbanNotification" ADD CONSTRAINT "KanbanNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
