-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FAQ" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "slug" TEXT,
    "pageTitle" TEXT,
    "version" TEXT NOT NULL DEFAULT 'Public',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FAQ" ("answer", "createdAt", "id", "isActive", "order", "question", "updatedAt") SELECT "answer", "createdAt", "id", "isActive", "order", "question", "updatedAt" FROM "FAQ";
DROP TABLE "FAQ";
ALTER TABLE "new_FAQ" RENAME TO "FAQ";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
