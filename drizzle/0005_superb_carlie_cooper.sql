ALTER TABLE `users` ADD `divisionId` int;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_divisionId_divisions_id_fk` FOREIGN KEY (`divisionId`) REFERENCES `divisions`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `users_division_idx` ON `users` (`divisionId`);