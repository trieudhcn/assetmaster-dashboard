CREATE TABLE `userAssetCatalogPreferences` (
	`userId` int NOT NULL,
	`columnOrder` json NOT NULL,
	`columnWidths` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userAssetCatalogPreferences_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userAssetCatalogPreferences` ADD CONSTRAINT `userAssetCatalogPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;