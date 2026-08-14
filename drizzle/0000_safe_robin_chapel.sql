CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`actorUserId` int,
	`actorName` varchar(160),
	`summary` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assetCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assetCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `assetCategories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetCode` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`categoryId` int,
	`departmentId` int,
	`holderUserId` int,
	`holderName` varchar(160),
	`status` enum('available','assigned','maintenance','retired','lost') NOT NULL DEFAULT 'available',
	`condition` enum('good','fair','needs_inspection','damaged') NOT NULL DEFAULT 'good',
	`purchaseDate` timestamp,
	`purchaseValue` decimal(15,2),
	`vendor` varchar(255),
	`serialNumber` varchar(160),
	`location` varchar(255),
	`warrantyUntil` timestamp,
	`qrToken` varchar(96) NOT NULL,
	`metadata` json,
	`note` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `assets_assetCode_unique` UNIQUE(`assetCode`),
	CONSTRAINT `assets_qrToken_unique` UNIQUE(`qrToken`)
);
--> statement-breakpoint
CREATE TABLE `auditItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditSessionId` int NOT NULL,
	`assetId` int NOT NULL,
	`expectedStatus` varchar(64),
	`actualStatus` varchar(64),
	`result` enum('pending','matched','missing','mismatch') NOT NULL DEFAULT 'pending',
	`checkedByUserId` int,
	`checkedAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auditItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`departmentId` int,
	`status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auditSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auditSessions_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`taxCode` varchar(32),
	`phone` varchar(32),
	`email` varchar(320),
	`logoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(160) NOT NULL,
	`managerUserId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`assetId` int NOT NULL,
	`recipientUserId` int,
	`recipientName` varchar(160) NOT NULL,
	`recipientDepartmentId` int,
	`recipientDepartmentName` varchar(160),
	`handoverByUserId` int,
	`handoverByName` varchar(160),
	`handedOverAt` timestamp NOT NULL,
	`dueBackAt` timestamp,
	`returnedAt` timestamp,
	`status` enum('draft','pending_signature','active','returned','cancelled') NOT NULL DEFAULT 'draft',
	`conditionOut` varchar(120),
	`conditionIn` varchar(120),
	`accessories` text,
	`note` text,
	`recipientSignatureUrl` text,
	`handoverSignatureUrl` text,
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handovers_id` PRIMARY KEY(`id`),
	CONSTRAINT `handovers_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `maintenanceTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketCode` varchar(64) NOT NULL,
	`assetId` int NOT NULL,
	`reporterUserId` int,
	`reporterName` varchar(160),
	`assigneeUserId` int,
	`issueType` enum('maintenance','incident','damage') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`description` text NOT NULL,
	`resolution` text,
	`estimatedCost` decimal(15,2),
	`actualCost` decimal(15,2),
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenanceTickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `maintenanceTickets_ticketCode_unique` UNIQUE(`ticketCode`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `activity_entity_idx` ON `activityLogs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `assets_status_idx` ON `assets` (`status`);--> statement-breakpoint
CREATE INDEX `assets_category_idx` ON `assets` (`categoryId`);--> statement-breakpoint
CREATE INDEX `assets_department_idx` ON `assets` (`departmentId`);--> statement-breakpoint
CREATE INDEX `audit_items_session_idx` ON `auditItems` (`auditSessionId`);--> statement-breakpoint
CREATE INDEX `audit_items_asset_idx` ON `auditItems` (`assetId`);--> statement-breakpoint
CREATE INDEX `handovers_asset_idx` ON `handovers` (`assetId`);--> statement-breakpoint
CREATE INDEX `handovers_recipient_idx` ON `handovers` (`recipientUserId`);--> statement-breakpoint
CREATE INDEX `handovers_status_idx` ON `handovers` (`status`);--> statement-breakpoint
CREATE INDEX `maintenance_asset_idx` ON `maintenanceTickets` (`assetId`);--> statement-breakpoint
CREATE INDEX `maintenance_status_idx` ON `maintenanceTickets` (`status`);