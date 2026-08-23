ALTER TABLE `users` ADD `employeeCode` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_employeeCode_unique` UNIQUE(`employeeCode`);