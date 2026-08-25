CREATE TABLE `softwareLicenseDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`softwareLicenseId` int NOT NULL,
	`documentType` enum('contract','renewal','other') NOT NULL DEFAULT 'other',
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`uploadedByUserId` int,
	`uploadedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `softwareLicenseDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `softwareLicenseDocuments` ADD CONSTRAINT `sld_license_fk` FOREIGN KEY (`softwareLicenseId`) REFERENCES `softwareLicenses`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `software_license_documents_license_idx` ON `softwareLicenseDocuments` (`softwareLicenseId`);
