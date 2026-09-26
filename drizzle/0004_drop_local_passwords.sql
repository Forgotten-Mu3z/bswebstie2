ALTER TABLE `users` DROP COLUMN `password_hash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `must_change_password`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_changed_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `totp_secret`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `totp_pending_secret`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `totp_last_step`;