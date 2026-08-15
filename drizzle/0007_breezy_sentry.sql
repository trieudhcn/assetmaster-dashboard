CREATE TABLE `vendorDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`documentType` enum('contract','quotation','other') NOT NULL DEFAULT 'other',
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`uploadedByUserId` int,
	`uploadedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendorDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vendorDocuments` ADD CONSTRAINT `vendorDocuments_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `vendor_documents_vendor_idx` ON `vendorDocuments` (`vendorId`);