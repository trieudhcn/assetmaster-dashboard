CREATE TABLE `supplyReturnRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestCode` varchar(64) NOT NULL,
	`requesterUserId` int NOT NULL,
	`requesterName` varchar(160) NOT NULL,
	`sourceType` enum('issue_slip','handover') NOT NULL,
	`sourceId` int NOT NULL,
	`sourceReferenceCode` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`note` text,
	`reviewNote` text,
	`reviewedByUserId` int,
	`reviewedByName` varchar(160),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplyReturnRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplyReturnRequests_requestCode_unique` UNIQUE(`requestCode`)
);
--> statement-breakpoint
CREATE TABLE `supplyReturnRequestItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`sourceItemId` int NOT NULL,
	`supplyId` int NOT NULL,
	`supplyCode` varchar(64) NOT NULL,
	`supplyName` varchar(255) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`requestedQuantity` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplyReturnRequestItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `supply_return_request_items_source_unique` UNIQUE(`requestId`,`sourceItemId`)
);
--> statement-breakpoint
ALTER TABLE `supplyReturnRequests` ADD CONSTRAINT `supplyReturnRequests_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyReturnRequests` ADD CONSTRAINT `supplyReturnRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD CONSTRAINT `supplyReturnRequestItems_requestId_supplyReturnRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `supplyReturnRequests`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD CONSTRAINT `supplyReturnRequestItems_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `supply_return_requests_requester_idx` ON `supplyReturnRequests` (`requesterUserId`);--> statement-breakpoint
CREATE INDEX `supply_return_requests_status_idx` ON `supplyReturnRequests` (`status`);--> statement-breakpoint
CREATE INDEX `supply_return_requests_source_idx` ON `supplyReturnRequests` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `supply_return_request_items_request_idx` ON `supplyReturnRequestItems` (`requestId`);--> statement-breakpoint
CREATE INDEX `supply_return_request_items_supply_idx` ON `supplyReturnRequestItems` (`supplyId`);