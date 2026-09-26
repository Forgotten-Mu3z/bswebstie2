ALTER TABLE `sessions` ADD `sign_in_state` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_code_at` integer;--> statement-breakpoint
-- Sessions from before Supabase sign-in end now; everyone signs in again.
DELETE FROM `sessions`;