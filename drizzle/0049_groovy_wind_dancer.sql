CREATE TABLE `userDashboardAlertStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertId` varchar(160) NOT NULL,
	`dismissedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userDashboardAlertStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_dashboard_alert_state_unique` UNIQUE(`userId`,`alertId`)
);
--> statement-breakpoint
ALTER TABLE `userDashboardAlertStates` ADD CONSTRAINT `userDashboardAlertStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `user_dashboard_alert_state_user_idx` ON `userDashboardAlertStates` (`userId`);