ALTER TABLE `users` ADD `entraGroupNames` json AFTER `entraObjectId`;--> statement-breakpoint
ALTER TABLE `users` ADD `lastEntraSyncAt` timestamp AFTER `entraGroupNames`;--> statement-breakpoint
CREATE TABLE `entraSettings` (
  `id` int NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `status` enum('draft','active','disabled') NOT NULL DEFAULT 'draft',
  `tenantId` varchar(64) NOT NULL,
  `clientId` varchar(64) NOT NULL,
  `redirectUri` varchar(500) NOT NULL,
  `clientSecretRef` varchar(255),
  `adminAppRole` varchar(160) NOT NULL DEFAULT 'AssetMaster.Admin',
  `userAppRole` varchar(160) NOT NULL DEFAULT 'AssetMaster.User',
  `lastTestStatus` enum('not_tested','success','failed') NOT NULL DEFAULT 'not_tested',
  `lastTestMessage` varchar(500),
  `lastTestedAt` timestamp,
  `lastSyncStatus` enum('not_run','success','partial','failed') NOT NULL DEFAULT 'not_run',
  `lastSyncMessage` varchar(500),
  `lastSyncedAt` timestamp,
  `createdByUserId` int,
  `updatedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `entraSettings_id` PRIMARY KEY(`id`),
  CONSTRAINT `entraSettings_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `entraSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);--> statement-breakpoint
CREATE INDEX `entra_settings_status_idx` ON `entraSettings` (`status`);--> statement-breakpoint
CREATE TABLE `entraSettingAudits` (
  `id` int AUTO_INCREMENT NOT NULL,
  `entraSettingsId` int NOT NULL,
  `version` int NOT NULL,
  `action` enum('saved','activated','disabled','tested','users_synced') NOT NULL,
  `summary` varchar(500) NOT NULL,
  `snapshot` json NOT NULL,
  `actorUserId` int,
  `actorName` varchar(160),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `entraSettingAudits_id` PRIMARY KEY(`id`),
  CONSTRAINT `entraSettingAudits_entraSettingsId_entraSettings_id_fk` FOREIGN KEY (`entraSettingsId`) REFERENCES `entraSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `entraSettingAudits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);--> statement-breakpoint
CREATE INDEX `entra_setting_audits_setting_created_idx` ON `entraSettingAudits` (`entraSettingsId`,`createdAt`);