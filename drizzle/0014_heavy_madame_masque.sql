CREATE TABLE `userNotificationPreferences` (
	`userId` int NOT NULL,
	`maintenanceEnabled` boolean NOT NULL DEFAULT true,
	`handoverEnabled` boolean NOT NULL DEFAULT true,
	`returnRequestEnabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userNotificationPreferences_userId` PRIMARY KEY(`userId`)
);
