ALTER TABLE `assets` ADD `retirementCertificateNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `assets` ADD `retirementCertificateYear` int;--> statement-breakpoint
ALTER TABLE `assets` ADD `retirementCertificateSequence` int;--> statement-breakpoint
ALTER TABLE `assets` ADD `retirementAttachmentUrl` text;--> statement-breakpoint
ALTER TABLE `assets` ADD `retirementAttachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `assets` ADD `retirementAttachmentContentType` varchar(100);--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_retirement_certificate_number_unique` UNIQUE(`retirementCertificateNumber`);