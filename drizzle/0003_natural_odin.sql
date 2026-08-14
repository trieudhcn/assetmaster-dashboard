ALTER TABLE `auditSessions` ADD `scheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `auditSessions` ADD `recurrenceDays` int;--> statement-breakpoint
ALTER TABLE `maintenanceTickets` ADD `dueAt` timestamp;--> statement-breakpoint
ALTER TABLE `maintenanceTickets` ADD `recurrenceDays` int;