-- Move from password login to Clerk, turn Post into a diary page, add Letters.
-- Old users keep their rows (clerkId stays NULL until they sign in with the same email).

-- User
ALTER TABLE "User" DROP COLUMN "password";
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT,
                   ADD COLUMN "handle" TEXT,
                   ADD COLUMN "phone" TEXT,
                   ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- Post
ALTER TABLE "Post" ALTER COLUMN "title" SET DEFAULT '';
ALTER TABLE "Post" RENAME COLUMN "publishedDate" TO "createdAt";
ALTER TABLE "Post" ADD COLUMN "paper" TEXT NOT NULL DEFAULT 'ruled',
                   ADD COLUMN "mood" TEXT,
                   ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
                   ADD COLUMN "shareId" TEXT,
                   ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Post_shareId_key" ON "Post"("shareId");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- Letter
CREATE TABLE "Letter" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "paper" TEXT NOT NULL DEFAULT 'ruled',
  "senderId" INTEGER NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "readAt" TIMESTAMP(3),
  "recipientDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Letter_recipientId_idx" ON "Letter"("recipientId");
CREATE INDEX "Letter_senderId_idx" ON "Letter"("senderId");
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
