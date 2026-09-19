CREATE TABLE `emailNotificationSettings` (
	`id` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','disabled') NOT NULL DEFAULT 'draft',
	`provider` enum('mock','microsoft_graph') NOT NULL DEFAULT 'mock',
	`tenantId` varchar(64),
	`clientId` varchar(64),
	`clientSecretRef` varchar(255) DEFAULT '/run/secrets/m365_mail_client_secret',
	`senderEmail` varchar(320),
	`senderName` varchar(160) NOT NULL DEFAULT 'AssetMaster',
	`applicationUrl` varchar(500),
	`handoverEnabled` boolean NOT NULL DEFAULT true,
	`supplyRequestEnabled` boolean NOT NULL DEFAULT true,
	`supplyReturnEnabled` boolean NOT NULL DEFAULT true,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`lastTestStatus` enum('not_tested','success','failed') NOT NULL DEFAULT 'not_tested',
	`lastTestMessage` varchar(500),
	`lastTestedAt` timestamp,
	`lastDispatchedAt` timestamp,
	`createdByUserId` int,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailNotificationSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailOutbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(190) NOT NULL,
	`category` enum('handover','supply_request','supply_return','system_test') NOT NULL,
	`templateKey` varchar(120) NOT NULL,
	`entityType` varchar(80),
	`entityId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(160),
	`subject` varchar(500) NOT NULL,
	`textBody` text NOT NULL,
	`htmlBody` text NOT NULL,
	`payload` json,
	`status` enum('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`attemptCount` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`nextAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`lastAttemptAt` timestamp,
	`sentAt` timestamp,
	`providerRequestId` varchar(255),
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailOutbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailOutbox_eventKey_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
ALTER TABLE `emailNotificationSettings` ADD CONSTRAINT `emailNotificationSettings_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `emailNotificationSettings` ADD CONSTRAINT `emailNotificationSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `email_notification_settings_status_idx` ON `emailNotificationSettings` (`status`);--> statement-breakpoint
CREATE INDEX `email_outbox_dispatch_idx` ON `emailOutbox` (`status`,`nextAttemptAt`);--> statement-breakpoint
CREATE INDEX `email_outbox_entity_idx` ON `emailOutbox` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `email_outbox_created_idx` ON `emailOutbox` (`createdAt`);
