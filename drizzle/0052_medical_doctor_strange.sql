CREATE TABLE `technologyVendorContracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractCode` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`technologyVendorId` int NOT NULL,
	`contractType` enum('license','service','framework','other') NOT NULL DEFAULT 'framework',
	`signedAt` timestamp,
	`effectiveFrom` timestamp,
	`effectiveTo` timestamp,
	`autoRenew` boolean NOT NULL DEFAULT false,
	`status` enum('draft','active','expiring','expired','cancelled') NOT NULL DEFAULT 'draft',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technologyVendorContracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `technologyVendorContracts_contractCode_unique` UNIQUE(`contractCode`)
);
--> statement-breakpoint
CREATE TABLE `technologyVendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`contactName` varchar(160),
	`phone` varchar(32),
	`email` varchar(320),
	`website` varchar(320),
	`address` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technologyVendors_id` PRIMARY KEY(`id`),
	CONSTRAINT `technologyVendors_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD `technologyVendorId` int;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD `technologyVendorContractId` int;--> statement-breakpoint
ALTER TABLE `technologyServices` ADD `technologyVendorId` int;--> statement-breakpoint
ALTER TABLE `technologyServices` ADD `technologyVendorContractId` int;--> statement-breakpoint
ALTER TABLE `technologyVendorContracts` ADD CONSTRAINT `tvc_vendor_fk` FOREIGN KEY (`technologyVendorId`) REFERENCES `technologyVendors`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `technology_vendor_contracts_vendor_idx` ON `technologyVendorContracts` (`technologyVendorId`);--> statement-breakpoint
CREATE INDEX `technology_vendor_contracts_status_expiry_idx` ON `technologyVendorContracts` (`status`,`effectiveTo`);--> statement-breakpoint
CREATE INDEX `technology_vendors_active_idx` ON `technologyVendors` (`isActive`);--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD CONSTRAINT `sl_tv_fk` FOREIGN KEY (`technologyVendorId`) REFERENCES `technologyVendors`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD CONSTRAINT `sl_tvc_fk` FOREIGN KEY (`technologyVendorContractId`) REFERENCES `technologyVendorContracts`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `technologyServices` ADD CONSTRAINT `ts_tv_fk` FOREIGN KEY (`technologyVendorId`) REFERENCES `technologyVendors`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `technologyServices` ADD CONSTRAINT `ts_tvc_fk` FOREIGN KEY (`technologyVendorContractId`) REFERENCES `technologyVendorContracts`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `software_licenses_technology_vendor_idx` ON `softwareLicenses` (`technologyVendorId`);--> statement-breakpoint
CREATE INDEX `software_licenses_technology_contract_idx` ON `softwareLicenses` (`technologyVendorContractId`);--> statement-breakpoint
CREATE INDEX `technology_services_technology_vendor_idx` ON `technologyServices` (`technologyVendorId`);--> statement-breakpoint
CREATE INDEX `technology_services_technology_contract_idx` ON `technologyServices` (`technologyVendorContractId`);
