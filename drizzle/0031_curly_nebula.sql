ALTER TABLE `assets` ADD COLUMN IF NOT EXISTS `retiredAt` timestamp;--> statement-breakpoint
ALTER TABLE `assets` ADD COLUMN IF NOT EXISTS `retirementReason` text;
