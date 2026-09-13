ALTER TABLE `users` MODIFY COLUMN `authSource` enum('manus','bootstrap_local','ldap','entra') NOT NULL DEFAULT 'manus';--> statement-breakpoint
ALTER TABLE `users` ADD `entraObjectId` varchar(192) AFTER `directoryObjectId`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_entraObjectId_unique` ON `users` (`entraObjectId`);--> statement-breakpoint
CREATE INDEX `users_entra_object_id_idx` ON `users` (`entraObjectId`);