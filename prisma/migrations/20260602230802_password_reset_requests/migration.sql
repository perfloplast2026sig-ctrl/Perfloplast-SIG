-- CreateTable
CREATE TABLE `PasswordResetRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requesterEmail` VARCHAR(160) NOT NULL,
    `userId` VARCHAR(120) NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    `resolvedById` VARCHAR(120) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PasswordResetRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `PasswordResetRequest_requesterEmail_createdAt_idx`(`requesterEmail`, `createdAt`),
    INDEX `PasswordResetRequest_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
