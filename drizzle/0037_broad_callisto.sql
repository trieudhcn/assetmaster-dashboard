ALTER TABLE `handovers` ADD `recoveryCertificateNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `handovers` ADD `recoveryCertificateYear` int;--> statement-breakpoint
ALTER TABLE `handovers` ADD `recoveryCertificateMonth` int;--> statement-breakpoint
ALTER TABLE `handovers` ADD `recoveryCertificateSequence` int;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_recoveryCertificateNumber_unique` UNIQUE(`recoveryCertificateNumber`);