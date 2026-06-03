-- AlterEnum
ALTER TABLE `Dispatch` MODIFY `status` ENUM('SCHEDULED', 'LOADED', 'IN_ROUTE', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED_TO_WAREHOUSE', 'RESCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE `Preorder`
  ADD COLUMN `saleLatitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `saleLongitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `saleAccuracy` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `Dispatch`
  ADD COLUMN `destinationLatitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `destinationLongitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `destinationAccuracy` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `DispatchReturn` (
    `id` VARCHAR(191) NOT NULL,
    `dispatchId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `resolution` VARCHAR(80) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DispatchReturn_dispatchId_idx`(`dispatchId`),
    INDEX `DispatchReturn_driverId_idx`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DispatchReturn` ADD CONSTRAINT `DispatchReturn_dispatchId_fkey` FOREIGN KEY (`dispatchId`) REFERENCES `Dispatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchReturn` ADD CONSTRAINT `DispatchReturn_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
