SET @assetmaster_0031_retired_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'retiredAt'
);--> statement-breakpoint
SET @assetmaster_0031_retired_at_sql := IF(
  @assetmaster_0031_retired_at_exists = 0,
  'ALTER TABLE `assets` ADD `retiredAt` timestamp',
  'SELECT 1'
);--> statement-breakpoint
PREPARE assetmaster_0031_retired_at_statement FROM @assetmaster_0031_retired_at_sql;--> statement-breakpoint
EXECUTE assetmaster_0031_retired_at_statement;--> statement-breakpoint
DEALLOCATE PREPARE assetmaster_0031_retired_at_statement;--> statement-breakpoint
SET @assetmaster_0031_retirement_reason_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'retirementReason'
);--> statement-breakpoint
SET @assetmaster_0031_retirement_reason_sql := IF(
  @assetmaster_0031_retirement_reason_exists = 0,
  'ALTER TABLE `assets` ADD `retirementReason` text',
  'SELECT 1'
);--> statement-breakpoint
PREPARE assetmaster_0031_retirement_reason_statement FROM @assetmaster_0031_retirement_reason_sql;--> statement-breakpoint
EXECUTE assetmaster_0031_retirement_reason_statement;--> statement-breakpoint
DEALLOCATE PREPARE assetmaster_0031_retirement_reason_statement;
