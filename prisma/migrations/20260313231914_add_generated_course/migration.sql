-- CreateTable
CREATE TABLE "GeneratedCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "courseData" JSONB NOT NULL,
    "moduleCount" INTEGER NOT NULL,
    "lessonCount" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedCourse_courseId_key" ON "GeneratedCourse"("courseId");

-- CreateIndex
CREATE INDEX "GeneratedCourse_userId_idx" ON "GeneratedCourse"("userId");

-- AddForeignKey
ALTER TABLE "GeneratedCourse" ADD CONSTRAINT "GeneratedCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
