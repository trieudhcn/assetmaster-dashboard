CREATE TABLE `assetFieldChanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`importSessionId` int,
	`fieldName` varchar(96) NOT NULL,
	`previousValue` text,
	`nextValue` text,
	`source` enum('import','manual','undo') NOT NULL,
	`actorUserId` int,
	`actorName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assetFieldChanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assetImportItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importSessionId` int NOT NULL,
	`assetId` int NOT NULL,
	`action` enum('created','updated') NOT NULL,
	`beforeSnapshot` json,
	`afterSnapshot` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assetImportItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assetImportSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdCount` int NOT NULL DEFAULT 0,
	`updatedCount` int NOT NULL DEFAULT 0,
	`isUndone` boolean NOT NULL DEFAULT false,
	`undoneAt` timestamp,
	`undoneByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assetImportSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assetImportSessions_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE INDEX `asset_field_changes_asset_idx` ON `assetFieldChanges` (`assetId`);--> statement-breakpoint
CREATE INDEX `asset_field_changes_session_idx` ON `assetFieldChanges` (`importSessionId`);--> statement-breakpoint
CREATE INDEX `asset_import_items_session_idx` ON `assetImportItems` (`importSessionId`);--> statement-breakpoint
CREATE INDEX `asset_import_items_asset_idx` ON `assetImportItems` (`assetId`);--> statement-breakpoint
CREATE INDEX `asset_import_sessions_created_idx` ON `assetImportSessions` (`createdAt`);