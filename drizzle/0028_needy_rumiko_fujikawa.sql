CREATE TABLE `supplyIssueSlipItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueSlipId` int NOT NULL,
	`supplyId` int NOT NULL,
	`supplyCode` varchar(64) NOT NULL,
	`supplyName` varchar(255) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`issuedQuantity` decimal(15,2) NOT NULL,
	`returnedQuantity` decimal(15,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplyIssueSlipItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplyIssueSlips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`recipientUserId` int,
	`recipientName` varchar(160) NOT NULL,
	`recipientDepartmentId` int,
	`status` enum('active','returned') NOT NULL DEFAULT 'active',
	`note` text,
	`issuedByUserId` int,
	`issuedByName` varchar(160),
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`returnedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplyIssueSlips_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplyIssueSlips_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
ALTER TABLE `inventoryMovements` MODIFY COLUMN `movementType` enum('receipt','issue','adjustment','return') NOT NULL;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD `issueSlipId` int;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD `issueSlipItemId` int;--> statement-breakpoint
ALTER TABLE `supplyIssueSlipItems` ADD CONSTRAINT `supplyIssueSlipItems_issueSlipId_supplyIssueSlips_id_fk` FOREIGN KEY (`issueSlipId`) REFERENCES `supplyIssueSlips`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyIssueSlipItems` ADD CONSTRAINT `supplyIssueSlipItems_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyIssueSlips` ADD CONSTRAINT `supplyIssueSlips_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `supply_issue_slip_items_slip_idx` ON `supplyIssueSlipItems` (`issueSlipId`);--> statement-breakpoint
CREATE INDEX `supply_issue_slip_items_supply_idx` ON `supplyIssueSlipItems` (`supplyId`);--> statement-breakpoint
CREATE INDEX `supply_issue_slips_issued_idx` ON `supplyIssueSlips` (`issuedAt`);--> statement-breakpoint
CREATE INDEX `supply_issue_slips_recipient_idx` ON `supplyIssueSlips` (`recipientUserId`);--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_issueSlipId_supplyIssueSlips_id_fk` FOREIGN KEY (`issueSlipId`) REFERENCES `supplyIssueSlips`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_issueSlipItemId_supplyIssueSlipItems_id_fk` FOREIGN KEY (`issueSlipItemId`) REFERENCES `supplyIssueSlipItems`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `inventory_movements_slip_idx` ON `inventoryMovements` (`issueSlipId`);