CREATE TABLE `supplyImportItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importSessionId` int NOT NULL,
	`supplyId` int NOT NULL,
	`action` enum('created','updated') NOT NULL,
	`beforeSnapshot` json,
	`afterSnapshot` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplyImportItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplyImportSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdCount` int NOT NULL DEFAULT 0,
	`updatedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplyImportSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplyImportSessions_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
ALTER TABLE `supplyImportItems` ADD CONSTRAINT `supplyImportItems_importSessionId_supplyImportSessions_id_fk` FOREIGN KEY (`importSessionId`) REFERENCES `supplyImportSessions`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyImportItems` ADD CONSTRAINT `supplyImportItems_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `supply_import_items_session_idx` ON `supplyImportItems` (`importSessionId`);--> statement-breakpoint
CREATE INDEX `supply_import_items_supply_idx` ON `supplyImportItems` (`supplyId`);--> statement-breakpoint
CREATE INDEX `supply_import_sessions_created_idx` ON `supplyImportSessions` (`createdAt`);