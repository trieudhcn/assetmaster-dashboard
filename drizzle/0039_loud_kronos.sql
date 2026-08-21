CREATE TABLE `supplyUnits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplyUnits_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplyUnits_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE INDEX `supply_units_active_idx` ON `supplyUnits` (`isActive`);