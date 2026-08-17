CREATE TABLE `helpGuideVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guideKey` varchar(96) NOT NULL,
	`audience` enum('admin','user') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`steps` json NOT NULL,
	`changedByUserId` int,
	`changedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `helpGuideVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `help_guide_versions_key_idx` ON `helpGuideVersions` (`guideKey`);--> statement-breakpoint
CREATE INDEX `help_guide_versions_created_idx` ON `helpGuideVersions` (`createdAt`);