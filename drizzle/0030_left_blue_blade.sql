CREATE TABLE `maintenanceMonthlyBudgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenanceMonthlyBudgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `maintenance_budget_year_month_unique` UNIQUE(`year`,`month`)
);
--> statement-breakpoint
CREATE INDEX `maintenance_budget_year_idx` ON `maintenanceMonthlyBudgets` (`year`);