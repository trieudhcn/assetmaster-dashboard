ALTER TABLE `maintenanceTickets` ADD `ticketYear` int;--> statement-breakpoint
ALTER TABLE `maintenanceTickets` ADD `ticketSequence` int;--> statement-breakpoint
CREATE INDEX `maintenance_year_sequence_idx` ON `maintenanceTickets` (`ticketYear`,`ticketSequence`);