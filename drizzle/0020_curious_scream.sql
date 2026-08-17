CREATE TABLE `helpGuides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guideKey` varchar(96) NOT NULL,
	`audience` enum('admin','user') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`steps` json NOT NULL,
	`updatedByUserId` int,
	`updatedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `helpGuides_id` PRIMARY KEY(`id`),
	CONSTRAINT `helpGuides_guideKey_unique` UNIQUE(`guideKey`)
);
--> statement-breakpoint
CREATE INDEX `help_guides_audience_idx` ON `helpGuides` (`audience`);