CREATE TABLE `handoverAssetItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handoverId` int NOT NULL,
	`assetId` int NOT NULL,
	`assetCode` varchar(64) NOT NULL,
	`assetName` varchar(255) NOT NULL,
	`conditionOut` varchar(120),
	`conditionIn` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handoverAssetItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `handover_asset_items_unique` UNIQUE(`handoverId`,`assetId`)
);
--> statement-breakpoint
ALTER TABLE `handoverAssetItems` ADD CONSTRAINT `handoverAssetItems_handoverId_handovers_id_fk` FOREIGN KEY (`handoverId`) REFERENCES `handovers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `handoverAssetItems` ADD CONSTRAINT `handoverAssetItems_assetId_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `handover_asset_items_handover_idx` ON `handoverAssetItems` (`handoverId`);--> statement-breakpoint
CREATE INDEX `handover_asset_items_asset_idx` ON `handoverAssetItems` (`assetId`);--> statement-breakpoint
INSERT INTO `handoverAssetItems` (`handoverId`, `assetId`, `assetCode`, `assetName`, `conditionOut`, `conditionIn`)
SELECT h.`id`, h.`assetId`, a.`assetCode`, a.`name`, h.`conditionOut`, h.`conditionIn`
FROM `handovers` h
INNER JOIN `assets` a ON a.`id` = h.`assetId`;