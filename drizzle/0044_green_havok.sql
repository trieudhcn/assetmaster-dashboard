CREATE TABLE `purchaseInvoiceDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseInvoiceId` int NOT NULL,
	`documentType` enum('invoice_pdf','invoice_xml','scan','delivery_note','adjustment','other') NOT NULL DEFAULT 'invoice_pdf',
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`uploadedByUserId` int,
	`uploadedByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchaseInvoiceDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseInvoiceLines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseInvoiceId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`itemType` enum('asset','supply','service','other') NOT NULL,
	`itemCode` varchar(64),
	`itemName` varchar(255) NOT NULL,
	`description` text,
	`quantity` decimal(15,2) NOT NULL,
	`unit` varchar(32),
	`unitPrice` decimal(15,2) NOT NULL,
	`discountAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`taxRate` decimal(5,2) NOT NULL DEFAULT '0',
	`taxAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`lineTotal` decimal(15,2) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseInvoiceLines_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_invoice_lines_invoice_number_unique` UNIQUE(`purchaseInvoiceId`,`lineNumber`)
);
--> statement-breakpoint
CREATE TABLE `purchaseInvoiceSupplyReceipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseInvoiceLineId` int NOT NULL,
	`supplyId` int NOT NULL,
	`receivedQuantity` decimal(15,2) NOT NULL,
	`unitCost` decimal(15,2),
	`taxRate` decimal(5,2) NOT NULL DEFAULT '0',
	`taxAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(15,2) NOT NULL,
	`inventoryMovementId` int,
	`status` enum('draft','received','reversed') NOT NULL DEFAULT 'draft',
	`receivedAt` timestamp,
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseInvoiceSupplyReceipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_invoice_supply_receipts_movement_unique` UNIQUE(`inventoryMovementId`)
);
--> statement-breakpoint
CREATE TABLE `purchaseInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceKey` varchar(160) NOT NULL,
	`invoiceNumber` varchar(64) NOT NULL,
	`invoiceSeries` varchar(64),
	`invoiceTemplate` varchar(64),
	`invoiceType` enum('vat','electronic','retail','adjustment','replacement','other') NOT NULL DEFAULT 'vat',
	`status` enum('draft','issued','adjusted','replaced','cancelled') NOT NULL DEFAULT 'draft',
	`vendorId` int NOT NULL,
	`purchaseContractId` int,
	`issuedAt` timestamp NOT NULL,
	`receivedAt` timestamp,
	`currencyCode` varchar(3) NOT NULL DEFAULT 'VND',
	`exchangeRate` decimal(18,6),
	`subtotalAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`taxAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(15,2) NOT NULL,
	`sourceInvoiceId` int,
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchaseInvoices_invoiceKey_unique` UNIQUE(`invoiceKey`)
);
--> statement-breakpoint
ALTER TABLE `assets` ADD `purchaseInvoiceId` int;--> statement-breakpoint
ALTER TABLE `assets` ADD `purchaseInvoiceLineId` int;--> statement-breakpoint
ALTER TABLE `purchaseInvoiceDocuments` ADD CONSTRAINT `pi_docs_invoice_fk` FOREIGN KEY (`purchaseInvoiceId`) REFERENCES `purchaseInvoices`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseInvoiceLines` ADD CONSTRAINT `purchaseInvoiceLines_purchaseInvoiceId_purchaseInvoices_id_fk` FOREIGN KEY (`purchaseInvoiceId`) REFERENCES `purchaseInvoices`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseInvoiceSupplyReceipts` ADD CONSTRAINT `pi_receipts_line_fk` FOREIGN KEY (`purchaseInvoiceLineId`) REFERENCES `purchaseInvoiceLines`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseInvoiceSupplyReceipts` ADD CONSTRAINT `purchaseInvoiceSupplyReceipts_supplyId_inventorySupplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `inventorySupplies`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseInvoices` ADD CONSTRAINT `purchaseInvoices_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchaseInvoices` ADD CONSTRAINT `purchaseInvoices_purchaseContractId_purchaseContracts_id_fk` FOREIGN KEY (`purchaseContractId`) REFERENCES `purchaseContracts`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `purchase_invoice_documents_invoice_type_idx` ON `purchaseInvoiceDocuments` (`purchaseInvoiceId`,`documentType`);--> statement-breakpoint
CREATE INDEX `purchase_invoice_lines_invoice_idx` ON `purchaseInvoiceLines` (`purchaseInvoiceId`);--> statement-breakpoint
CREATE INDEX `purchase_invoice_lines_type_idx` ON `purchaseInvoiceLines` (`itemType`);--> statement-breakpoint
CREATE INDEX `purchase_invoice_supply_receipts_line_idx` ON `purchaseInvoiceSupplyReceipts` (`purchaseInvoiceLineId`);--> statement-breakpoint
CREATE INDEX `purchase_invoice_supply_receipts_supply_received_idx` ON `purchaseInvoiceSupplyReceipts` (`supplyId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `purchase_invoices_vendor_issued_idx` ON `purchaseInvoices` (`vendorId`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `purchase_invoices_contract_idx` ON `purchaseInvoices` (`purchaseContractId`);--> statement-breakpoint
CREATE INDEX `purchase_invoices_status_issued_idx` ON `purchaseInvoices` (`status`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `purchase_invoices_source_idx` ON `purchaseInvoices` (`sourceInvoiceId`);--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_purchaseInvoiceId_purchaseInvoices_id_fk` FOREIGN KEY (`purchaseInvoiceId`) REFERENCES `purchaseInvoices`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_purchaseInvoiceLineId_purchaseInvoiceLines_id_fk` FOREIGN KEY (`purchaseInvoiceLineId`) REFERENCES `purchaseInvoiceLines`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `assets_purchase_invoice_idx` ON `assets` (`purchaseInvoiceId`);--> statement-breakpoint
CREATE INDEX `assets_purchase_invoice_line_idx` ON `assets` (`purchaseInvoiceLineId`);
