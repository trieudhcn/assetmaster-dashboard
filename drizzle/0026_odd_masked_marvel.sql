CREATE TABLE `inventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplyId` int NOT NULL,
	`movementType` enum('receipt','issue','adjustment') NOT NULL,
	`quantity` decimal(15,2) NOT NULL,
	`quantityBefore` decimal(15,2) NOT NULL,
	`quantityAfter` decimal(15,2) NOT NULL,
	`recipientName` varchar(160),
	`recipientDepartmentId` int,
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventorySupplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`categoryId` int,
	`vendorId` int,
	`brandId` int,
	`unit` varchar(32) NOT NULL DEFAULT 'Cái',
	`stockQuantity` decimal(15,2) NOT NULL DEFAULT '0',
	`minimumQuantity` decimal(15,2) NOT NULL DEFAULT '0',
	`unitCost` decimal(15,2),
	`location` varchar(255),
	`note` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventorySupplies_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventorySupplies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventorySupplies` ADD CONSTRAINT `inventorySupplies_categoryId_assetCategories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `assetCategories`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventorySupplies` ADD CONSTRAINT `inventorySupplies_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventorySupplies` ADD CONSTRAINT `inventorySupplies_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `inventory_movements_supply_idx` ON `inventoryMovements` (`supplyId`);--> statement-breakpoint
CREATE INDEX `inventory_movements_created_idx` ON `inventoryMovements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `inventory_supplies_category_idx` ON `inventorySupplies` (`categoryId`);--> statement-breakpoint
CREATE INDEX `inventory_supplies_active_idx` ON `inventorySupplies` (`isActive`);