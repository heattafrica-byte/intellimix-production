CREATE TABLE `automation_lanes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`parameter` varchar(100) NOT NULL,
	`points` json,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_lanes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`genre` varchar(100) NOT NULL,
	`subGenre` varchar(100),
	`targetLufs` float NOT NULL DEFAULT -14,
	`targetSampleRate` int NOT NULL DEFAULT 44100,
	`targetBitDepth` int NOT NULL DEFAULT 24,
	`status` enum('uploading','analysing','processing','mastering','complete','error') NOT NULL DEFAULT 'uploading',
	`sessionAnalysis` text,
	`mixdownWavUrl` text,
	`masterWavUrl` text,
	`masterAiffUrl` text,
	`masterFlacUrl` text,
	`mixdownLufs` float,
	`mixdownLra` float,
	`mixdownTruePeak` float,
	`masterLufs` float,
	`masterLra` float,
	`masterTruePeak` float,
	`masteringReport` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`genre` varchar(100),
	`bpm` int DEFAULT 120,
	`masterVolume` float DEFAULT 1,
	`masterSettings` json,
	`aiInsights` text,
	`duration` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileSizeBytes` int NOT NULL DEFAULT 0,
	`mimeType` varchar(100) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`stemType` varchar(100),
	`stemCategory` varchar(50),
	`processingParams` json,
	`processingStatus` enum('pending','processing','complete','error') NOT NULL DEFAULT 'pending',
	`processingError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `track_effects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`effectType` varchar(50) NOT NULL,
	`params` json,
	`enabled` boolean DEFAULT true,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `track_effects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(20) DEFAULT '#6366f1',
	`order` int DEFAULT 0,
	`volume` float DEFAULT 1,
	`pan` float DEFAULT 0,
	`muted` boolean DEFAULT false,
	`soloed` boolean DEFAULT false,
	`audioFileUrl` text,
	`audioFileKey` varchar(512),
	`audioFileName` varchar(255),
	`audioDuration` float DEFAULT 0,
	`waveformData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);
