-- =============================================================================
-- GYMVAULT V2.0 - INITIAL SEED DATA
-- =============================================================================

USE `gymvault`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'ADMIN', 'Gym operational administrator and security officer with full access'),
(2, 'TRAINER', 'Fitness trainer managing assigned members, workout plans, and sessions'),
(3, 'MEMBER', 'Gym member with access to personal profile, workouts, and payments')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- 2. Permissions
-- -----------------------------------------------------------------------------
INSERT INTO `permissions` (`id`, `code`, `name`, `module`, `description`) VALUES
(1, 'dashboard:view', 'View Dashboard', 'dashboard', 'Access gym operational and financial overview'),
(2, 'member:manage', 'Manage Members', 'member', 'Full CRUD access on gym members'),
(3, 'member:read_own', 'Read Own Member Profile', 'member', 'View personal member record only'),
(4, 'trainer:manage', 'Manage Trainers', 'trainer', 'Full CRUD access on gym trainers'),
(5, 'membership:manage', 'Manage Membership Plans', 'membership', 'Create and modify membership packages'),
(6, 'payment:process', 'Process Payments', 'payment', 'Record and verify customer subscription payments'),
(7, 'payment:read_own', 'Read Own Payments', 'payment', 'View personal payment receipts and status'),
(8, 'workout:manage_all', 'Manage All Workouts', 'workout', 'Admin manage all workout programs'),
(9, 'workout:manage_assigned', 'Manage Assigned Workouts', 'workout', 'Trainer manage workout programs for assigned members'),
(10, 'workout:view_own', 'View Own Workout', 'workout', 'Member view personal workout programs'),
(11, 'schedule:manage_all', 'Manage All Schedules', 'schedule', 'Admin manage all calendar booking slots'),
(12, 'schedule:manage_trainer', 'Manage Trainer Slots', 'schedule', 'Trainer manage own session availability'),
(13, 'schedule:view_member', 'View & Book Schedule', 'schedule', 'Member view and book sessions'),
(14, 'crypto:message', 'Use Secure Messaging', 'crypto', 'Send and decrypt end-to-end super encrypted messages'),
(15, 'crypto:files', 'Access Encrypted Files', 'crypto', 'Manage ChaCha20 encrypted vault documents'),
(16, 'stego:use', 'Use Steganography Studio', 'stego', 'Encode and decode hidden messages via LSB PNG'),
(17, 'blockchain:audit', 'Audit Blockchain Ledger', 'blockchain', 'Inspect SHA-256 asset blocks and run tamper checks'),
(18, 'security:monitor', 'Security Center Monitor', 'security', 'View hardware dongle, biometric, and event logs')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- 3. Role Permissions Mapping
-- -----------------------------------------------------------------------------
-- Admin gets all permissions (1 - 18)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, `id` FROM `permissions`;

-- Trainer gets: dashboard:view (restricted), workout:manage_assigned, schedule:manage_trainer, crypto:message, crypto:files, stego:use
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(2, 1),
(2, 9),
(2, 12),
(2, 14),
(2, 15),
(2, 16);

-- Member gets: member:read_own, payment:read_own, workout:view_own, schedule:view_member, crypto:message
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(3, 3),
(3, 7),
(3, 10),
(3, 13),
(3, 14);

-- -----------------------------------------------------------------------------
-- 4. Initial Users
-- Password for all seed users is formatted with real Argon2id hashes:
-- admin -> Admin123!
-- trainer_john -> Trainer123!
-- member_alice -> Member123!
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `uuid`, `username`, `password_hash`, `role_id`, `is_active`) VALUES
(1, '550e8400-e29b-41d4-a716-446655440001', 'admin', '$argon2id$v=19$m=65536,t=3,p=4$nIaqsBNc8nwS+Z1p/SmjKw$M6RXAFy/EZDTMrQZAPOFMUHrIaMiu0B7cN4V+QVBSls', 1, 1),
(2, '550e8400-e29b-41d4-a716-446655440002', 'trainer_john', '$argon2id$v=19$m=65536,t=3,p=4$Whj5dzArRdpis488MNrptQ$3sKH43OLGgBaDr22IOg8MFkwQylsTjYW+Y6z7CqKZiU', 2, 1),
(3, '550e8400-e29b-41d4-a716-446655440003', 'member_alice', '$argon2id$v=19$m=65536,t=3,p=4$OMHKCk99OZ7tDIUH096b3w$q1FzeZjEVBm+TyOvhL0BhkQ1Keq9EesB3TYzZJ7KCdc', 3, 1)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- -----------------------------------------------------------------------------
-- 5. Trainer Profile
-- -----------------------------------------------------------------------------
INSERT INTO `trainers` (`id`, `uuid`, `user_id`, `trainer_code`, `full_name`, `specialization`, `phone_encrypted`, `phone_blind_index`, `certification_info`, `bio`, `is_active`) VALUES
(1, '660e8400-e29b-41d4-a716-446655440002', 2, 'TRN-001', 'John ' || 'Doe', 'Strength & Hypertrophy', 'enc:v1:dummyiv:phoneciphertext:dummytag', 'b5d36e76cf89d6e7bf6ff6b1c34a2e577239274e1d51a69be745d070b47fe732', 'NASM-CPT, CSCS Certified', 'Head Strength Coach with 7+ years of athlete training experience.', 1)
ON DUPLICATE KEY UPDATE `trainer_code` = VALUES(`trainer_code`);

-- -----------------------------------------------------------------------------
-- 6. Member Profile
-- -----------------------------------------------------------------------------
INSERT INTO `members` (`id`, `uuid`, `user_id`, `member_code`, `full_name`, `email_encrypted`, `email_blind_index`, `phone_encrypted`, `phone_blind_index`, `join_date`) VALUES
(1, '770e8400-e29b-41d4-a716-446655440003', 3, 'MBR-001', 'Alice ' || 'Smith', 'enc:v1:dummyiv:emailciphertext:dummytag', 'c7be0c6828fe2764b73cb3776e107df6c7f5c71b3e15b253b26c36773a907289', 'enc:v1:dummyiv:phoneciphertext:dummytag', '5f4ecc342f01f37e42d711b7d41334c2c77d4c2df47b35520857ef51df693b4a', '2026-01-15')
ON DUPLICATE KEY UPDATE `member_code` = VALUES(`member_code`);

-- -----------------------------------------------------------------------------
-- 7. Membership Plans
-- -----------------------------------------------------------------------------
INSERT INTO `membership_plans` (`id`, `code`, `name`, `duration_months`, `price`, `description`, `is_active`) VALUES
(1, 'PLAN-1M', 'Bronze Monthly', 1, 350000.00, 'Akses penuh seluruh fasilitas gym selama 30 hari.', 1),
(2, 'PLAN-3M', 'Silver Quarterly', 3, 950000.00, 'Akses fasilitas gym 3 bulan + 2 sesi konsultasi trainer.', 1),
(3, 'PLAN-6M', 'Gold Semi-Annual', 6, 1750000.00, 'Akses fasilitas gym 6 bulan + 5 sesi personal trainer.', 1),
(4, 'PLAN-12M', 'Platinum Annual', 12, 3200000.00, 'Akses VIP tahunan + konsultasi nutrisi & loker pribadi.', 1)
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);

-- -----------------------------------------------------------------------------
-- 8. Blockchain Genesis Block
-- -----------------------------------------------------------------------------
INSERT INTO `blockchain` (`id`, `block_index`, `timestamp`, `asset_id`, `asset_type`, `asset_canonical_hash`, `previous_hash`, `block_hash`, `is_tampered`) VALUES
(1, 0, 1718000000000, 'GENESIS', 'SYSTEM', 'aef7f54b31b3c644bcb71216b0e5cfbeb1d533bf814dd45a507258179c8b583d', '0000000000000000000000000000000000000000000000000000000000000000', 'dda8506579058ddbfaad9c82389a73a53b55f37f702bbad0d4dc37c86726b94d', 0)
ON DUPLICATE KEY UPDATE `block_hash` = VALUES(`block_hash`);

-- -----------------------------------------------------------------------------
-- 9. Encryption Keys Metadata
-- -----------------------------------------------------------------------------
INSERT INTO `encryption_keys_metadata` (`id`, `key_identifier`, `algorithm`, `version`, `is_active`) VALUES
(1, 'DEK_DATABASE_AES', 'AES-256-GCM', 1, 1),
(2, 'DEK_FILES_CHACHA', 'ChaCha20-Poly1305', 1, 1),
(3, 'DEK_MESSAGING_AES', 'AES-256-GCM', 1, 1),
(4, 'KEY_BLIND_INDEX_HMAC', 'HMAC-SHA256', 1, 1)
ON DUPLICATE KEY UPDATE `key_identifier` = VALUES(`key_identifier`);

SET FOREIGN_KEY_CHECKS = 1;
