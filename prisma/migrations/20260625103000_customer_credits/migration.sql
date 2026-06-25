-- CreateTable
CREATE TABLE `CustomerCredit` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `preorderId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `clientName` VARCHAR(180) NOT NULL,
    `taxId` VARCHAR(80) NULL,
    `phone` VARCHAR(40) NULL,
    `address` VARCHAR(255) NULL,
    `sellerName` VARCHAR(120) NULL,
    `preorderCode` VARCHAR(80) NOT NULL,
    `invoiceNumber` VARCHAR(80) NULL,
    `creditAmountGTQ` DECIMAL(14, 2) NOT NULL,
    `openingBalanceGTQ` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('OPEN', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `notes` VARCHAR(255) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerCredit_code_key`(`code`),
    UNIQUE INDEX `CustomerCredit_preorderId_key`(`preorderId`),
    UNIQUE INDEX `CustomerCredit_invoiceId_key`(`invoiceId`),
    INDEX `CustomerCredit_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `CustomerCredit_clientName_idx`(`clientName`),
    INDEX `CustomerCredit_preorderCode_idx`(`preorderCode`),
    INDEX `CustomerCredit_invoiceNumber_idx`(`invoiceNumber`),
    INDEX `CustomerCredit_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `CustomerCredit_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditPayment` (
    `id` VARCHAR(191) NOT NULL,
    `creditId` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bank` VARCHAR(120) NULL,
    `documentNumber` VARCHAR(120) NULL,
    `amountGTQ` DECIMAL(14, 2) NOT NULL,
    `notes` VARCHAR(255) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditPayment_creditId_paymentDate_idx`(`creditId`, `paymentDate`),
    INDEX `CreditPayment_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `CreditPayment_documentNumber_idx`(`documentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerCredit` ADD CONSTRAINT `CustomerCredit_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerCredit` ADD CONSTRAINT `CustomerCredit_preorderId_fkey` FOREIGN KEY (`preorderId`) REFERENCES `Preorder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerCredit` ADD CONSTRAINT `CustomerCredit_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerCredit` ADD CONSTRAINT `CustomerCredit_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditPayment` ADD CONSTRAINT `CreditPayment_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `CustomerCredit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditPayment` ADD CONSTRAINT `CreditPayment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;