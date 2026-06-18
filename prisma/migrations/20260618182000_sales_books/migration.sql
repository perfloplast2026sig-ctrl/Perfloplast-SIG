CREATE TABLE `SalesBook` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startNumber` INTEGER NOT NULL,
    `endNumber` INTEGER NOT NULL,
    `nextNumber` INTEGER NOT NULL,
    `warningThreshold` INTEGER NOT NULL DEFAULT 10,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalesBook_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `SalesBook_nextNumber_idx`(`nextNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SalesBook` ADD CONSTRAINT `SalesBook_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
