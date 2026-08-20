CREATE TABLE `handoverSupplyItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handoverId` int NOT NULL,
	`supplyId` int NOT NULL,
	`supplyCode` varchar(64) NOT NULL,
	`supplyName` varchar(255) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`issuedQuantity` decimal(15,2) NOT NULL,
	`returnedQuantity` decimal(15,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handoverSupplyItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD `handoverId` int;--> statement-breakpoint
ALTER TABLE `handoverSupplyItems` ADD CONSTRAINT `handoverSupplyItems_handoverId_handovers_id_fk` FOREIGN KEY (`handoverId`) REFERENCES `handovers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `handoverSupplyItems` ADD CONSTRAINT `handoverSupplyItems_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `handover_supply_items_handover_idx` ON `handoverSupplyItems` (`handoverId`);--> statement-breakpoint
CREATE INDEX `handover_supply_items_supply_idx` ON `handoverSupplyItems` (`supplyId`);--> statement-breakpoint
CREATE INDEX `inventory_movements_handover_idx` ON `inventoryMovements` (`handoverId`);