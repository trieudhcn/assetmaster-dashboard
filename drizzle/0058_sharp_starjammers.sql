CREATE TABLE `installationSettings` (
	`id` int NOT NULL,
	`status` enum('installing','installed') NOT NULL DEFAULT 'installing',
	`websiteName` varchar(255) NOT NULL,
	`websiteUrl` varchar(320),
	`databaseName` varchar(128) NOT NULL,
	`bootstrapEmail` varchar(320) NOT NULL,
	`installedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `installationSettings_id` PRIMARY KEY(`id`)
);
