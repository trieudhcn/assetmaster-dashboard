CREATE TABLE `supplyRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestCode` varchar(64) NOT NULL,
	`requesterUserId` int NOT NULL,
	`requesterName` varchar(160) NOT NULL,
	`requesterDepartmentId` int,
	`status` enum('pending','approved','rejected','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
	`reason` text NOT NULL,
	`reviewNote` text,
	`reviewedByUserId` int,
	`reviewedByName` varchar(160),
	`reviewedAt` timestamp,
	`issueSlipId` int,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplyRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplyRequests_requestCode_unique` UNIQUE(`requestCode`),
	CONSTRAINT `supply_requests_issue_slip_unique` UNIQUE(`issueSlipId`)
);
--> statement-breakpoint
CREATE TABLE `supplyRequestItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`supplyId` int NOT NULL,
	`supplyCode` varchar(64) NOT NULL,
	`supplyName` varchar(255) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`requestedQuantity` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplyRequestItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `supply_request_items_request_supply_unique` UNIQUE(`requestId`,`supplyId`)
);
--> statement-breakpoint
ALTER TABLE `supplyRequests` ADD CONSTRAINT `supplyRequests_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyRequests` ADD CONSTRAINT `supplyRequests_requesterDepartmentId_departments_id_fk` FOREIGN KEY (`requesterDepartmentId`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyRequests` ADD CONSTRAINT `supplyRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyRequests` ADD CONSTRAINT `supplyRequests_issueSlipId_supplyIssueSlips_id_fk` FOREIGN KEY (`issueSlipId`) REFERENCES `supplyIssueSlips`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyRequestItems` ADD CONSTRAINT `supplyRequestItems_requestId_supplyRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `supplyRequests`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyRequestItems` ADD CONSTRAINT `supplyRequestItems_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `supply_requests_status_idx` ON `supplyRequests` (`status`);--> statement-breakpoint
CREATE INDEX `supply_requests_requester_created_idx` ON `supplyRequests` (`requesterUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supply_request_items_request_idx` ON `supplyRequestItems` (`requestId`);--> statement-breakpoint
CREATE INDEX `supply_request_items_supply_idx` ON `supplyRequestItems` (`supplyId`);