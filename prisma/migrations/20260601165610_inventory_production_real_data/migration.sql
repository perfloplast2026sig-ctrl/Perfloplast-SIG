-- AlterTable
ALTER TABLE `Location` ADD COLUMN `isFactoryWarehouse` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `color` VARCHAR(80) NULL;

-- AlterTable
ALTER TABLE `ProductionOrder` ADD COLUMN `destinationLocationId` VARCHAR(191) NULL,
    ADD COLUMN `plannedQuantity` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `producedQuantity` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    ADD COLUMN `shiftEnd` VARCHAR(20) NULL,
    ADD COLUMN `shiftStart` VARCHAR(20) NULL,
    ADD COLUMN `targetProductId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Product_type_idx` ON `Product`(`type`);

-- CreateIndex
CREATE INDEX `ProductionOrder_targetProductId_idx` ON `ProductionOrder`(`targetProductId`);

-- CreateIndex
CREATE INDEX `ProductionOrder_destinationLocationId_idx` ON `ProductionOrder`(`destinationLocationId`);

-- AddForeignKey
ALTER TABLE `ProductionOrder` ADD CONSTRAINT `ProductionOrder_targetProductId_fkey` FOREIGN KEY (`targetProductId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionOrder` ADD CONSTRAINT `ProductionOrder_destinationLocationId_fkey` FOREIGN KEY (`destinationLocationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
