CREATE TABLE `softwareLicenseActivationAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`softwareLicenseId` int NOT NULL,
	`loginEmail` varchar(320) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`maxUsers` int NOT NULL,
	`status` enum('active','suspended','retired') NOT NULL DEFAULT 'active',
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `softwareLicenseActivationAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `software_license_activation_account_license_email_unique` UNIQUE(`softwareLicenseId`,`loginEmail`)
);
--> statement-breakpoint
CREATE TABLE `softwareLicenseCredentialAccessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`softwareLicenseId` int NOT NULL,
	`softwareLicenseKeyId` int,
	`softwareLicenseActivationAccountId` int,
	`accessType` enum('view_key','copy_key','view_password','copy_password') NOT NULL,
	`actorUserId` int NOT NULL,
	`actorName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `softwareLicenseCredentialAccessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `softwareLicenseKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`softwareLicenseId` int NOT NULL,
	`encryptedKey` text NOT NULL,
	`keyFingerprint` varchar(64) NOT NULL,
	`maskedKey` varchar(96) NOT NULL,
	`status` enum('available','assigned','revoked','retired') NOT NULL DEFAULT 'available',
	`note` text,
	`createdByUserId` int,
	`createdByName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `softwareLicenseKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `software_license_keys_license_fingerprint_unique` UNIQUE(`softwareLicenseId`,`keyFingerprint`)
);
--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD `assignmentMethod` enum('seat','product_key','shared_account') DEFAULT 'seat' NOT NULL;--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD `softwareLicenseKeyId` int;--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD `softwareLicenseActivationAccountId` int;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD `activationMode` enum('seat','product_key','shared_account') DEFAULT 'seat' NOT NULL;--> statement-breakpoint
ALTER TABLE `softwareLicenses` ADD `sharedAccountMaxUsers` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `softwareLicenseActivationAccounts` ADD CONSTRAINT `sla_license_fk` FOREIGN KEY (`softwareLicenseId`) REFERENCES `softwareLicenses`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseCredentialAccessLogs` ADD CONSTRAINT `slcal_license_fk` FOREIGN KEY (`softwareLicenseId`) REFERENCES `softwareLicenses`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseCredentialAccessLogs` ADD CONSTRAINT `slcal_key_fk` FOREIGN KEY (`softwareLicenseKeyId`) REFERENCES `softwareLicenseKeys`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseCredentialAccessLogs` ADD CONSTRAINT `slcal_account_fk` FOREIGN KEY (`softwareLicenseActivationAccountId`) REFERENCES `softwareLicenseActivationAccounts`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseCredentialAccessLogs` ADD CONSTRAINT `slcal_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseKeys` ADD CONSTRAINT `slk_license_fk` FOREIGN KEY (`softwareLicenseId`) REFERENCES `softwareLicenses`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `software_license_activation_account_license_status_idx` ON `softwareLicenseActivationAccounts` (`softwareLicenseId`,`status`);--> statement-breakpoint
CREATE INDEX `software_license_credential_access_license_idx` ON `softwareLicenseCredentialAccessLogs` (`softwareLicenseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `software_license_credential_access_account_idx` ON `softwareLicenseCredentialAccessLogs` (`softwareLicenseActivationAccountId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `software_license_keys_license_status_idx` ON `softwareLicenseKeys` (`softwareLicenseId`,`status`);--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD CONSTRAINT `sla_key_fk` FOREIGN KEY (`softwareLicenseKeyId`) REFERENCES `softwareLicenseKeys`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `softwareLicenseAssignments` ADD CONSTRAINT `sla_account_fk` FOREIGN KEY (`softwareLicenseActivationAccountId`) REFERENCES `softwareLicenseActivationAccounts`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `software_license_assignments_key_status_idx` ON `softwareLicenseAssignments` (`softwareLicenseKeyId`,`status`);--> statement-breakpoint
CREATE INDEX `software_license_assignments_account_status_idx` ON `softwareLicenseAssignments` (`softwareLicenseActivationAccountId`,`status`);
