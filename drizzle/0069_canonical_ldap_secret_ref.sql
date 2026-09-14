ALTER TABLE `directorySettings`
  MODIFY COLUMN `bindSecretRef` varchar(255) DEFAULT '/run/secrets/ldap_bind_password';--> statement-breakpoint
UPDATE `directorySettings`
SET `bindSecretRef` = '/run/secrets/ldap_bind_password'
WHERE `bindSecretRef` = '/run/secrets/assetmaster_ldap_bind_password';
