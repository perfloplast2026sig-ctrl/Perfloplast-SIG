-- AlterTable
ALTER TABLE `Product` ADD COLUMN `catalogExternalId` VARCHAR(180) NULL,
    ADD COLUMN `catalogImageUrl` VARCHAR(500) NULL,
    ADD COLUMN `catalogProductId` VARCHAR(120) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `modelName` VARCHAR(120) NULL,
    ADD COLUMN `priceGTQ` DECIMAL(14, 2) NULL;

-- CreateIndex
CREATE INDEX `Product_catalogExternalId_idx` ON `Product`(`catalogExternalId`);

-- CreateIndex
CREATE INDEX `Product_catalogProductId_idx` ON `Product`(`catalogProductId`);
