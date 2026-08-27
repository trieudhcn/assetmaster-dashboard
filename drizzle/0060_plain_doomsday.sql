CREATE TABLE `fileStorageSettings` (
	`id` int NOT NULL,
	`mode` enum('shared_directory') NOT NULL DEFAULT 'shared_directory',
	`relativeDirectory` varchar(160) NOT NULL DEFAULT 'attachments',
	`lastTestStatus` enum('not_tested','success','failed') NOT NULL DEFAULT 'not_tested',
	`lastTestMessage` varchar(300),
	`lastTestedAt` timestamp,
	`updatedByUserId` int,
	`updatedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fileStorageSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fileStorageSettings` ADD CONSTRAINT `fileStorageSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;