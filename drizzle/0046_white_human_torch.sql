CREATE TABLE `userMenuPreferences` (
	`userId` int NOT NULL,
	`menuOrder` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userMenuPreferences_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userMenuPreferences` ADD CONSTRAINT `userMenuPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;