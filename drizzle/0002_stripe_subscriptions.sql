-- Migration: Add Stripe support to users and create subscriptions table
-- Created: 2026-04-01

-- Add stripeCustomerId column to users table
ALTER TABLE `users` ADD COLUMN `stripeCustomerId` varchar(255);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `stripeCustomerId` varchar(255) NOT NULL,
  `stripeSubscriptionId` varchar(255) NOT NULL UNIQUE,
  `planName` varchar(100) NOT NULL DEFAULT 'basic',
  `status` enum('active','canceled','past_due','paused','trialing') NOT NULL DEFAULT 'active',
  `currentPeriodEnd` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `userId` (`userId`),
  KEY `stripeCustomerId` (`stripeCustomerId`),
  KEY `stripeSubscriptionId` (`stripeSubscriptionId`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
);
