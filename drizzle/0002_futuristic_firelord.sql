ALTER TABLE `maintenanceTickets` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `maintenanceTickets` ADD `attachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `maintenanceTickets` ADD `attachmentContentType` varchar(128);