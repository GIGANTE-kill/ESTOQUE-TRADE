-- AddColumn: bloqueado em materials
ALTER TABLE "materials" ADD COLUMN "bloqueado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: user_category_permissions
CREATE TABLE "user_category_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_category_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique (userId, categoryId)
CREATE UNIQUE INDEX "user_category_permissions_userId_categoryId_key" ON "user_category_permissions"("userId", "categoryId");

-- AddForeignKey: userId -> users
ALTER TABLE "user_category_permissions" ADD CONSTRAINT "user_category_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: categoryId -> categories
ALTER TABLE "user_category_permissions" ADD CONSTRAINT "user_category_permissions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
