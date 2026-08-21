CREATE TABLE `retirementCertificateAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retirementCertificateId` int NOT NULL,
	`assetId` int NOT NULL,
	`retirementReason` text NOT NULL,
	`salvageValue` decimal(15,2),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retirementCertificateAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `retirement_certificate_assets_certificate_asset_unique` UNIQUE(`retirementCertificateId`,`assetId`),
	CONSTRAINT `retirement_certificate_assets_asset_unique` UNIQUE(`assetId`)
);
--> statement-breakpoint
CREATE TABLE `retirementCertificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(64) NOT NULL,
	`retirementYear` int NOT NULL,
	`sequence` int NOT NULL,
	`status` enum('draft','awaiting_signed_copy','closed') NOT NULL DEFAULT 'draft',
	`retiredAt` timestamp NOT NULL,
	`signedDocumentKey` text,
	`signedDocumentUrl` text,
	`signedDocumentName` varchar(255),
	`signedDocumentContentType` varchar(128),
	`signedDocumentUploadedAt` timestamp,
	`signedDocumentUploadedByUserId` int,
	`closedAt` timestamp,
	`closedByUserId` int,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retirementCertificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `retirementCertificates_referenceCode_unique` UNIQUE(`referenceCode`),
	CONSTRAINT `retirement_certificates_year_sequence_unique` UNIQUE(`retirementYear`,`sequence`)
);
--> statement-breakpoint
ALTER TABLE `assets` DROP INDEX `assets_retirement_certificate_number_unique`;--> statement-breakpoint
ALTER TABLE `assets` ADD `retirementCertificateId` int;--> statement-breakpoint
ALTER TABLE `retirementCertificateAssets` ADD CONSTRAINT `ret_cert_assets_certificate_fk` FOREIGN KEY (`retirementCertificateId`) REFERENCES `retirementCertificates`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `retirementCertificateAssets` ADD CONSTRAINT `ret_cert_assets_asset_fk` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `retirement_certificate_assets_certificate_idx` ON `retirementCertificateAssets` (`retirementCertificateId`);--> statement-breakpoint
CREATE INDEX `retirement_certificates_status_idx` ON `retirementCertificates` (`status`);--> statement-breakpoint
CREATE INDEX `retirement_certificates_retired_at_idx` ON `retirementCertificates` (`retiredAt`);--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_retirement_certificate_fk` FOREIGN KEY (`retirementCertificateId`) REFERENCES `retirementCertificates`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `assets_retirement_certificate_idx` ON `assets` (`retirementCertificateId`);
