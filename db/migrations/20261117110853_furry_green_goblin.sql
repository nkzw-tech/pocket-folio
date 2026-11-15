-- void:allow-destructive
CREATE TABLE `binder` (
	`userId` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`columns` integer NOT NULL,
	`rows` integer NOT NULL,
	`doubleSided` integer NOT NULL,
	`color` text,
	`coverSetId` text,
	`coverSetConfigured` integer NOT NULL,
	`pocketOpening` text,
	`presetSetId` text,
	`shareToken` text,
	`slotCount` integer NOT NULL,
	`revision` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`userId`, `id`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "binder_layout" CHECK("binder"."rows" between 2 and 4 and "binder"."columns" between 2 and 4),
	CONSTRAINT "binder_capacity" CHECK("binder"."slotCount" between 0 and 2000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `binder_share_token` ON `binder` (`shareToken`);--> statement-breakpoint
CREATE INDEX `binder_owner_revision` ON `binder` (`userId`,`revision`);--> statement-breakpoint
CREATE TABLE `binder_pocket` (
	`userId` text NOT NULL,
	`binderId` text NOT NULL,
	`position` integer NOT NULL,
	`printingId` text NOT NULL,
	PRIMARY KEY(`userId`, `binderId`, `position`),
	FOREIGN KEY (`userId`,`binderId`) REFERENCES `binder`(`userId`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pocket_position" CHECK("binder_pocket"."position" between 0 and 1999)
);
--> statement-breakpoint
CREATE INDEX `pocket_printing` ON `binder_pocket` (`userId`,`printingId`);--> statement-breakpoint
CREATE TABLE `card_ownership` (
	`userId` text NOT NULL,
	`printingId` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`userId`, `printingId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ownership_status" CHECK("card_ownership"."status" in ('missing', 'wishlist', 'purchased', 'owned'))
);
--> statement-breakpoint
CREATE INDEX `ownership_owner_revision` ON `card_ownership` (`userId`,`revision`);--> statement-breakpoint
CREATE TABLE `collection_profile` (
	`userId` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token` text,
	`revision` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_token` ON `collection_profile` (`token`);--> statement-breakpoint
CREATE TABLE `profile_binder` (
	`userId` text NOT NULL,
	`binderId` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`userId`, `binderId`),
	FOREIGN KEY (`userId`) REFERENCES `collection_profile`(`userId`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`,`binderId`) REFERENCES `binder`(`userId`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workspace_revision` (
	`revision` integer DEFAULT 0 NOT NULL,
	`userId` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `collection_state`;--> statement-breakpoint
DROP TABLE `public_binder`;--> statement-breakpoint
DROP TABLE `public_profile`;
--> statement-breakpoint
-- The pre-production collection store is intentionally replaced. Auth and catalog stay intact.
DELETE FROM operation_receipt;
--> statement-breakpoint
DELETE FROM agent_change;
