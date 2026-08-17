CREATE TABLE `uiLabels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`labelKey` varchar(96) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updatedByUserId` int,
	`updatedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uiLabels_id` PRIMARY KEY(`id`),
	CONSTRAINT `uiLabels_labelKey_unique` UNIQUE(`labelKey`)
);
--> statement-breakpoint
CREATE INDEX `ui_labels_updated_idx` ON `uiLabels` (`updatedAt`);