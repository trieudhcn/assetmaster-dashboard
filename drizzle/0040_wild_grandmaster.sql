CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(160) NOT NULL,
	`address` text,
	`phone` varchar(32),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`),
	CONSTRAINT `branches_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `assets` ADD `branchId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `branchId` int;--> statement-breakpoint
CREATE INDEX `branches_active_idx` ON `branches` (`isActive`);--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `assets_branch_idx` ON `assets` (`branchId`);--> statement-breakpoint
CREATE INDEX `users_branch_idx` ON `users` (`branchId`);