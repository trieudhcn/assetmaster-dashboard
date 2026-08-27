CREATE TABLE `backupRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupType` enum('mysql_logical','runtime','file_storage','full') NOT NULL,
	`status` enum('completed','failed') NOT NULL,
	`verificationStatus` enum('not_verified','verified','failed') NOT NULL DEFAULT 'not_verified',
	`storageReference` varchar(255) NOT NULL,
	`completedAt` timestamp NOT NULL,
	`note` text,
	`recordedByUserId` int,
	`recordedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backupRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backupRestoreDrills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupRecordId` int,
	`status` enum('successful','failed') NOT NULL,
	`environment` varchar(160) NOT NULL,
	`completedAt` timestamp NOT NULL,
	`note` text,
	`recordedByUserId` int,
	`recordedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backupRestoreDrills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `backupRecords` ADD CONSTRAINT `backupRecords_recordedByUserId_users_id_fk` FOREIGN KEY (`recordedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `backupRestoreDrills` ADD CONSTRAINT `backupRestoreDrills_backupRecordId_backupRecords_id_fk` FOREIGN KEY (`backupRecordId`) REFERENCES `backupRecords`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `backupRestoreDrills` ADD CONSTRAINT `backupRestoreDrills_recordedByUserId_users_id_fk` FOREIGN KEY (`recordedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `backup_records_completed_idx` ON `backupRecords` (`completedAt`);--> statement-breakpoint
CREATE INDEX `backup_records_status_idx` ON `backupRecords` (`status`);--> statement-breakpoint
CREATE INDEX `backup_restore_drills_completed_idx` ON `backupRestoreDrills` (`completedAt`);--> statement-breakpoint
CREATE INDEX `backup_restore_drills_backup_idx` ON `backupRestoreDrills` (`backupRecordId`);