-- CreateTable
CREATE TABLE `DispatchReturnItem` (
    `id` VARCHAR(191) NOT NULL,
    `dispatchReturnId` VARCHAR(191) NOT NULL,
    `dispatchItemId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DispatchReturnItem_dispatchReturnId_dispatchItemId_key`(`dispatchReturnId`, `dispatchItemId`),
    INDEX `DispatchReturnItem_dispatchReturnId_idx`(`dispatchReturnId`),
    INDEX `DispatchReturnItem_dispatchItemId_idx`(`dispatchItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DispatchReturnItem` ADD CONSTRAINT `DispatchReturnItem_dispatchReturnId_fkey` FOREIGN KEY (`dispatchReturnId`) REFERENCES `DispatchReturn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchReturnItem` ADD CONSTRAINT `DispatchReturnItem_dispatchItemId_fkey` FOREIGN KEY (`dispatchItemId`) REFERENCES `DispatchItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
