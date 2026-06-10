-- DropForeignKey
ALTER TABLE `Dispatch` DROP FOREIGN KEY `Dispatch_truckId_fkey`;

-- CreateIndex
CREATE INDEX `AuditLog_userId_createdAt_idx` ON `AuditLog`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `AuditLog_entity_entityId_idx` ON `AuditLog`(`entity`, `entityId`);

-- CreateIndex
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog`(`createdAt`);

-- CreateIndex
CREATE INDEX `Client_taxId_idx` ON `Client`(`taxId`);

-- CreateIndex
CREATE INDEX `Client_createdAt_idx` ON `Client`(`createdAt`);

-- CreateIndex
CREATE INDEX `Dispatch_status_createdAt_idx` ON `Dispatch`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `Dispatch_scheduledAt_idx` ON `Dispatch`(`scheduledAt`);

-- CreateIndex
CREATE INDEX `Dispatch_responsibleId_createdAt_idx` ON `Dispatch`(`responsibleId`, `createdAt`);

-- CreateIndex
CREATE INDEX `InventoryMovement_createdAt_idx` ON `InventoryMovement`(`createdAt`);

-- CreateIndex
CREATE INDEX `InventoryMovement_type_createdAt_idx` ON `InventoryMovement`(`type`, `createdAt`);

-- CreateIndex
CREATE INDEX `InventoryMovement_productId_createdAt_idx` ON `InventoryMovement`(`productId`, `createdAt`);

-- CreateIndex
CREATE INDEX `InventoryMovement_createdById_createdAt_idx` ON `InventoryMovement`(`createdById`, `createdAt`);

-- CreateIndex
CREATE INDEX `Invoice_issuedAt_idx` ON `Invoice`(`issuedAt`);

-- CreateIndex
CREATE INDEX `Location_type_isActive_idx` ON `Location`(`type`, `isActive`);

-- CreateIndex
CREATE INDEX `Location_isFactoryWarehouse_idx` ON `Location`(`isFactoryWarehouse`);

-- CreateIndex
CREATE INDEX `Preorder_status_createdAt_idx` ON `Preorder`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `Preorder_createdAt_idx` ON `Preorder`(`createdAt`);

-- CreateIndex
CREATE INDEX `Preorder_createdById_createdAt_idx` ON `Preorder`(`createdById`, `createdAt`);

-- CreateIndex
CREATE INDEX `Preorder_originLocationId_idx` ON `Preorder`(`originLocationId`);

-- CreateIndex
CREATE INDEX `Product_isActive_type_idx` ON `Product`(`isActive`, `type`);

-- CreateIndex
CREATE INDEX `ProductionOrder_status_createdAt_idx` ON `ProductionOrder`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `ProductionOrder_responsibleId_createdAt_idx` ON `ProductionOrder`(`responsibleId`, `createdAt`);

-- CreateIndex
CREATE INDEX `ShiftSchedule_isActive_sortOrder_idx` ON `ShiftSchedule`(`isActive`, `sortOrder`);

-- CreateIndex
CREATE INDEX `StockBalance_productId_idx` ON `StockBalance`(`productId`);

-- AddForeignKey
ALTER TABLE `Dispatch` ADD CONSTRAINT `Dispatch_truckId_fkey` FOREIGN KEY (`truckId`) REFERENCES `Truck`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Dispatch` RENAME INDEX `Dispatch_preorderId_fkey` TO `Dispatch_preorderId_idx`;

-- RenameIndex
ALTER TABLE `Dispatch` RENAME INDEX `Dispatch_truckId_fkey` TO `Dispatch_truckId_idx`;

-- RenameIndex
ALTER TABLE `DispatchItem` RENAME INDEX `DispatchItem_dispatchId_fkey` TO `DispatchItem_dispatchId_idx`;

-- RenameIndex
ALTER TABLE `DispatchItem` RENAME INDEX `DispatchItem_preorderItemId_fkey` TO `DispatchItem_preorderItemId_idx`;

-- RenameIndex
ALTER TABLE `DispatchItem` RENAME INDEX `DispatchItem_productId_fkey` TO `DispatchItem_productId_idx`;

-- RenameIndex
ALTER TABLE `InventoryMovement` RENAME INDEX `InventoryMovement_dispatchItemId_fkey` TO `InventoryMovement_dispatchItemId_idx`;

-- RenameIndex
ALTER TABLE `InventoryMovement` RENAME INDEX `InventoryMovement_fromLocationId_fkey` TO `InventoryMovement_fromLocationId_idx`;

-- RenameIndex
ALTER TABLE `InventoryMovement` RENAME INDEX `InventoryMovement_preorderItemId_fkey` TO `InventoryMovement_preorderItemId_idx`;

-- RenameIndex
ALTER TABLE `InventoryMovement` RENAME INDEX `InventoryMovement_productionOrderId_fkey` TO `InventoryMovement_productionOrderId_idx`;

-- RenameIndex
ALTER TABLE `InventoryMovement` RENAME INDEX `InventoryMovement_toLocationId_fkey` TO `InventoryMovement_toLocationId_idx`;

-- RenameIndex
ALTER TABLE `Preorder` RENAME INDEX `Preorder_clientId_fkey` TO `Preorder_clientId_idx`;

-- RenameIndex
ALTER TABLE `PreorderItem` RENAME INDEX `PreorderItem_preorderId_fkey` TO `PreorderItem_preorderId_idx`;

-- RenameIndex
ALTER TABLE `PreorderItem` RENAME INDEX `PreorderItem_productId_fkey` TO `PreorderItem_productId_idx`;

-- RenameIndex
ALTER TABLE `Product` RENAME INDEX `Product_categoryId_fkey` TO `Product_categoryId_idx`;

-- RenameIndex
ALTER TABLE `ProductionConsumption` RENAME INDEX `ProductionConsumption_productId_fkey` TO `ProductionConsumption_productId_idx`;

-- RenameIndex
ALTER TABLE `ProductionConsumption` RENAME INDEX `ProductionConsumption_productionOrderId_fkey` TO `ProductionConsumption_productionOrderId_idx`;

-- RenameIndex
ALTER TABLE `ProductionOutput` RENAME INDEX `ProductionOutput_productId_fkey` TO `ProductionOutput_productId_idx`;

-- RenameIndex
ALTER TABLE `ProductionOutput` RENAME INDEX `ProductionOutput_productionOrderId_fkey` TO `ProductionOutput_productionOrderId_idx`;

-- RenameIndex
ALTER TABLE `RolePermission` RENAME INDEX `RolePermission_permissionId_fkey` TO `RolePermission_permissionId_idx`;

-- RenameIndex
ALTER TABLE `StockBalance` RENAME INDEX `StockBalance_locationId_fkey` TO `StockBalance_locationId_idx`;
