CREATE TABLE `licenseTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licenseTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `licenseTypes_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD `licenseTypeId` int;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD `purchaseInvoiceNumber` varchar(96);--> statement-breakpoint
CREATE INDEX `license_types_active_idx` ON `licenseTypes` (`isActive`);--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD CONSTRAINT `softwareLicenses_licenseTypeId_licenseTypes_id_fk` FOREIGN KEY (`licenseTypeId`) REFERENCES `licenseTypes`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `software_licenses_license_type_idx` ON `softwareLicenses` (`licenseTypeId`);--> statement-breakpoint
CREATE INDEX `software_licenses_invoice_number_idx` ON `softwareLicenses` (`purchaseInvoiceNumber`);