CREATE TABLE `account_email_budget` (
	`count` integer NOT NULL,
	`key` text PRIMARY KEY NOT NULL,
	`lastSentAt` integer NOT NULL,
	`windowStartedAt` integer NOT NULL
);
