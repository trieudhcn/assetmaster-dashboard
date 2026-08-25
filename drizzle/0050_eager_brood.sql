CREATE TABLE `softwareLicenseAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`softwareLicenseId` int NOT NULL,
	`assetId` int,
	`userId` int,
	`assignedToName` varchar(160),
	`deviceName` varchar(160),
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `softwareLicenseAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `softwareLicenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseCode` varchar(64) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`publisher` varchar(160),
	`edition` varchar(160),
	`licenseModel` enum('perpetual','subscription','volume','oem','other') NOT NULL DEFAULT 'subscription',
	`licenseKey` text,
	`purchasedQuantity` int NOT NULL DEFAULT 1,
	`vendorId` int,
	`purchaseContractId` int,
	`purchaseInvoiceId` int,
	`purchasedAt` timestamp,
	`expiresAt` timestamp,
	`autoRenew` boolean NOT NULL DEFAULT false,
	`status` enum('active','expiring','expired','suspended','retired') NOT NULL DEFAULT 'active',
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `softwareLicenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `softwareLicenses_licenseCode_unique` UNIQUE(`licenseCode`)
);
--> statement-breakpoint
CREATE TABLE `technologyServices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceCode` varchar(64) NOT NULL,
	`serviceType` enum('internet','domain','ssl') NOT NULL,
	`name` varchar(255) NOT NULL,
	`vendorId` int,
	`branchId` int,
	`accountReference` varchar(160),
	`billingReference` varchar(160),
	`domainName` varchar(255),
	`serviceEndpoint` varchar(255),
	`startedAt` timestamp,
	`renewalAt` timestamp,
	`expiresAt` timestamp,
	`autoRenew` boolean NOT NULL DEFAULT false,
	`billingCycle` enum('monthly','quarterly','annual','other') NOT NULL DEFAULT 'annual',
	`costAmount` decimal(15,2),
	`status` enum('active','expiring','expired','suspended','cancelled') NOT NULL DEFAULT 'active',
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technologyServices_id` PRIMARY KEY(`id`),
	CONSTRAINT `technologyServices_serviceCode_unique` UNIQUE(`serviceCode`)
);
--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD CONSTRAINT `sl_assign_license_fk` FOREIGN KEY (`softwareLicenseId`) REFERENCES `softwareLicenses`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD CONSTRAINT `sl_assign_asset_fk` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD CONSTRAINT `sl_assign_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD CONSTRAINT `sl_vendor_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD CONSTRAINT `sl_contract_fk` FOREIGN KEY (`purchaseContractId`) REFERENCES `purchaseContracts`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD CONSTRAINT `sl_invoice_fk` FOREIGN KEY (`purchaseInvoiceId`) REFERENCES `purchaseInvoices`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `technologyServices` ADD CONSTRAINT `ts_vendor_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `technologyServices` ADD CONSTRAINT `ts_branch_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `software_license_assignments_license_status_idx` ON `softwareLicenseAssignments` (`softwareLicenseId`,`status`);--> statement-breakpoint
CREATE INDEX `software_license_assignments_asset_idx` ON `softwareLicenseAssignments` (`assetId`);--> statement-breakpoint
CREATE INDEX `software_license_assignments_user_idx` ON `softwareLicenseAssignments` (`userId`);--> statement-breakpoint
CREATE INDEX `software_licenses_status_expiry_idx` ON `softwareLicenses` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `software_licenses_vendor_idx` ON `softwareLicenses` (`vendorId`);--> statement-breakpoint
CREATE INDEX `technology_services_type_status_expiry_idx` ON `technologyServices` (`serviceType`,`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `technology_services_vendor_idx` ON `technologyServices` (`vendorId`);--> statement-breakpoint
CREATE INDEX `technology_services_branch_idx` ON `technologyServices` (`branchId`);
