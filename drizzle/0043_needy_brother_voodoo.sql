CREATE TABLE `purchaseContractDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseContractId` int NOT NULL,
	`documentType` enum('signed_contract','appendix','quotation','other') NOT NULL DEFAULT 'other',
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`uploadedByUserId` int,
	`uploadedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchaseContractDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseContractItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseContractId` int NOT NULL,
	`itemType` enum('asset','supply') NOT NULL,
	`assetId` int,
	`supplyId` int,
	`itemCode` varchar(64) NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`quantity` decimal(15,2) NOT NULL DEFAULT '1',
	`unit` varchar(32),
	`unitPrice` decimal(15,2),
	`warrantyUntil` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseContractItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseContracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`vendorId` int,
	`signedAt` timestamp,
	`effectiveFrom` timestamp,
	`effectiveTo` timestamp,
	`totalValue` decimal(15,2),
	`status` enum('draft','active','expired','cancelled') NOT NULL DEFAULT 'draft',
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseContracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchaseContracts_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
ALTER TABLE `assets` ADD `purchaseContractId` int;--> statement-breakpoint
ALTER TABLE `inventorySupplies` ADD `purchaseContractId` int;--> statement-breakpoint
ALTER TABLE `purchaseContractDocuments` ADD CONSTRAINT `pc_docs_contract_fk` FOREIGN KEY (`purchaseContractId`) REFERENCES `purchaseContracts`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseContractItems` ADD CONSTRAINT `pc_items_contract_fk` FOREIGN KEY (`purchaseContractId`) REFERENCES `purchaseContracts`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseContractItems` ADD CONSTRAINT `pc_items_asset_fk` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseContractItems` ADD CONSTRAINT `pc_items_supply_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseContracts` ADD CONSTRAINT `pc_vendor_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `purchase_contract_documents_contract_idx` ON `purchaseContractDocuments` (`purchaseContractId`);--> statement-breakpoint
CREATE INDEX `purchase_contract_items_contract_idx` ON `purchaseContractItems` (`purchaseContractId`);--> statement-breakpoint
CREATE INDEX `purchase_contract_items_asset_idx` ON `purchaseContractItems` (`assetId`);--> statement-breakpoint
CREATE INDEX `purchase_contract_items_supply_idx` ON `purchaseContractItems` (`supplyId`);--> statement-breakpoint
CREATE INDEX `purchase_contracts_vendor_idx` ON `purchaseContracts` (`vendorId`);--> statement-breakpoint
CREATE INDEX `purchase_contracts_status_idx` ON `purchaseContracts` (`status`);--> statement-breakpoint
CREATE INDEX `purchase_contracts_signed_at_idx` ON `purchaseContracts` (`signedAt`);--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_pc_fk` FOREIGN KEY (`purchaseContractId`) REFERENCES `purchaseContracts`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventorySupplies` ADD CONSTRAINT `supplies_pc_fk` FOREIGN KEY (`purchaseContractId`) REFERENCES `purchaseContracts`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `assets_purchase_contract_idx` ON `assets` (`purchaseContractId`);--> statement-breakpoint
CREATE INDEX `inventory_supplies_purchase_contract_idx` ON `inventorySupplies` (`purchaseContractId`);
