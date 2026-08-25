CREATE TABLE `technologyVendorContractDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`technologyVendorContractId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`uploadedByUserId` int,
	`uploadedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `technologyVendorContractDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `technologyVendorContractDocuments` ADD CONSTRAINT `tvcd_contract_fk` FOREIGN KEY (`technologyVendorContractId`) REFERENCES `technologyVendorContracts`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `tvcd_contract_idx` ON `technologyVendorContractDocuments` (`technologyVendorContractId`);
