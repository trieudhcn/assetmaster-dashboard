ALTER TABLE `inventorySupplies` ADD `damagedQuantity` decimal(15,2) DEFAULT '0' NOT NULL AFTER `stockQuantity`;--> statement-breakpoint
ALTER TABLE `inventorySupplies` ADD `repairQuantity` decimal(15,2) DEFAULT '0' NOT NULL AFTER `damagedQuantity`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequests` ADD `returnReceiptCode` varchar(64) AFTER `sourceReferenceCode`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequests` ADD `deliveredByName` varchar(160) AFTER `returnReceiptCode`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequests` ADD `receivedByName` varchar(160) AFTER `deliveredByName`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequests` ADD `receiptCreatedAt` timestamp AFTER `receivedByName`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD `goodQuantity` decimal(15,2) DEFAULT '0' NOT NULL AFTER `requestedQuantity`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD `damagedQuantity` decimal(15,2) DEFAULT '0' NOT NULL AFTER `goodQuantity`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD `missingQuantity` decimal(15,2) DEFAULT '0' NOT NULL AFTER `damagedQuantity`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD `repairQuantity` decimal(15,2) DEFAULT '0' NOT NULL AFTER `missingQuantity`;--> statement-breakpoint
ALTER TABLE `supplyReturnRequestItems` ADD `conditionNote` text AFTER `repairQuantity`;--> statement-breakpoint
CREATE UNIQUE INDEX `supply_return_requests_receipt_unique` ON `supplyReturnRequests` (`returnReceiptCode`);