ALTER TABLE `handovers` ADD `returnRequestStatus` enum('none','pending','approved','rejected') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `handovers` ADD `returnRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `handovers` ADD `returnRequestNote` text;--> statement-breakpoint
ALTER TABLE `handovers` ADD `returnRequestResolvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `handovers` ADD `returnRequestResolvedByUserId` int;--> statement-breakpoint
ALTER TABLE `handovers` ADD `returnRequestResolution` text;