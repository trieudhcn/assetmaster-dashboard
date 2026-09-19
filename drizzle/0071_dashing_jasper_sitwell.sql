ALTER TABLE `emailNotificationSettings` ADD `brandName` varchar(160) DEFAULT 'AssetMaster' NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotificationSettings` ADD `brandColor` varchar(9) DEFAULT '#0F8C8C' NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotificationSettings` ADD `logoUrl` text;--> statement-breakpoint
ALTER TABLE `emailNotificationSettings` ADD `footerText` varchar(500) DEFAULT 'Đây là email tự động từ AssetMaster. Vui lòng không trả lời email này.' NOT NULL;--> statement-breakpoint
ALTER TABLE `emailNotificationSettings` ADD `templateOverrides` json;
