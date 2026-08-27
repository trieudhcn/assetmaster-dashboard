CREATE TABLE `directorySettingAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`directorySettingsId` int NOT NULL,
	`version` int NOT NULL,
	`action` enum('saved','activated','disabled','tested') NOT NULL,
	`summary` varchar(300) NOT NULL,
	`snapshot` json NOT NULL,
	`actorUserId` int,
	`actorName` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directorySettingAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directorySettings` (
	`id` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','disabled') NOT NULL DEFAULT 'draft',
	`ldapUrl` varchar(320) NOT NULL,
	`usersDn` text NOT NULL,
	`groupsDn` text,
	`bindDn` text,
	`loginAttribute` varchar(64) NOT NULL DEFAULT 'mail',
	`emailAttribute` varchar(64) NOT NULL DEFAULT 'mail',
	`displayNameAttribute` varchar(64) NOT NULL DEFAULT 'displayName',
	`directoryIdAttribute` varchar(64) NOT NULL DEFAULT 'objectGUID',
	`departmentAttribute` varchar(64) NOT NULL DEFAULT 'department',
	`jobTitleAttribute` varchar(64) NOT NULL DEFAULT 'title',
	`adminGroupDn` text,
	`userGroupDn` text,
	`allowNestedGroups` boolean NOT NULL DEFAULT false,
	`caCertificatePem` text,
	`bindSecretConfigured` boolean NOT NULL DEFAULT false,
	`lastTestStatus` enum('not_tested','success','failed') NOT NULL DEFAULT 'not_tested',
	`lastTestMessage` varchar(300),
	`lastTestedAt` timestamp,
	`createdByUserId` int,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `directorySettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selfHostedSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selfHostedSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `selfHostedSessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `authSource` enum('manus','bootstrap_local','ldap') DEFAULT 'manus' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `directoryObjectId` varchar(192);--> statement-breakpoint
ALTER TABLE `users` ADD `directoryUsername` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `lastDirectorySyncAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_directoryObjectId_unique` UNIQUE(`directoryObjectId`);--> statement-breakpoint
ALTER TABLE `directorySettingAudits` ADD CONSTRAINT `dir_audit_settings_fk` FOREIGN KEY (`directorySettingsId`) REFERENCES `directorySettings`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `directorySettingAudits` ADD CONSTRAINT `dir_audit_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `directorySettings` ADD CONSTRAINT `dir_settings_created_by_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `directorySettings` ADD CONSTRAINT `dir_settings_updated_by_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `selfHostedSessions` ADD CONSTRAINT `self_hosted_session_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `directory_setting_audits_setting_created_idx` ON `directorySettingAudits` (`directorySettingsId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `directory_settings_status_idx` ON `directorySettings` (`status`);--> statement-breakpoint
CREATE INDEX `self_hosted_sessions_user_idx` ON `selfHostedSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `self_hosted_sessions_expiry_idx` ON `selfHostedSessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `users_auth_source_idx` ON `users` (`authSource`);--> statement-breakpoint
CREATE INDEX `users_directory_username_idx` ON `users` (`directoryUsername`);
