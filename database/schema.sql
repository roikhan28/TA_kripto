-- =============================================================================
-- GYMVAULT V2.0 - DATABASE SCHEMA DEFINITION
-- Smart Gym Management & Security System
-- Engine: MySQL 8.x / InnoDB
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `gymvault` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `gymvault`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Table: roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. Table: permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. Table: role_permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL, -- Argon2id PHC string
  `role_id` INT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL,
  `last_login_at` DATETIME NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_role_id` (`role_id`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. Table: members
-- Sensitive PII (email, phone, emergency contact) are AES-256-GCM encrypted.
-- Blind indexes allow exact search without exposing plaintext.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` INT NOT NULL UNIQUE,
  `member_code` VARCHAR(30) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `email_encrypted` TEXT NOT NULL,
  `email_blind_index` VARCHAR(64) NOT NULL, -- HMAC-SHA256 hex
  `phone_encrypted` TEXT NOT NULL,
  `phone_blind_index` VARCHAR(64) NOT NULL, -- HMAC-SHA256 hex
  `emergency_contact_encrypted` TEXT NULL,
  `date_of_birth` DATE NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') DEFAULT 'MALE',
  `join_date` DATE NOT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_members_code` (`member_code`),
  INDEX `idx_members_email_bi` (`email_blind_index`),
  INDEX `idx_members_phone_bi` (`phone_blind_index`),
  INDEX `idx_members_deleted` (`is_deleted`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. Table: trainers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trainers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` INT NOT NULL UNIQUE,
  `trainer_code` VARCHAR(30) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `specialization` VARCHAR(100) NOT NULL,
  `phone_encrypted` TEXT NOT NULL,
  `phone_blind_index` VARCHAR(64) NOT NULL,
  `certification_info` TEXT NULL,
  `bio` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_trainers_code` (`trainer_code`),
  INDEX `idx_trainers_specialization` (`specialization`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. Table: membership_plans
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `membership_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `duration_months` INT NOT NULL, -- 1 (monthly), 3 (quarterly), 6 (biannual), 12 (annual)
  `price` DECIMAL(12, 2) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. Table: member_memberships
-- Expiration calculated strictly in backend.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `member_memberships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `member_id` INT NOT NULL,
  `plan_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `auto_renew` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_id`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT,
  INDEX `idx_memberships_member_id` (`member_id`),
  INDEX `idx_memberships_status` (`status`),
  INDEX `idx_memberships_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. Table: payments
-- Guaranteed consistent via database transactions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transaction_code` VARCHAR(50) NOT NULL UNIQUE,
  `member_id` INT NOT NULL,
  `membership_id` INT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_method` ENUM('CASH', 'TRANSFER', 'QRIS', 'CREDIT_CARD') NOT NULL DEFAULT 'TRANSFER',
  `payment_status` ENUM('COMPLETED', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `receipt_hash` VARCHAR(64) NOT NULL, -- SHA-256 of receipt canonical fields
  `notes_encrypted` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`membership_id`) REFERENCES `member_memberships`(`id`) ON DELETE RESTRICT,
  INDEX `idx_payments_tx_code` (`transaction_code`),
  INDEX `idx_payments_member` (`member_id`),
  INDEX `idx_payments_paid_at` (`paid_at`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. Table: workout_plans
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workout_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `trainer_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `goal_description` TEXT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE,
  INDEX `idx_workout_trainer` (`trainer_id`),
  INDEX `idx_workout_member` (`member_id`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 11. Table: workout_details
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workout_details` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `workout_plan_id` INT NOT NULL,
  `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  `exercise_name` VARCHAR(100) NOT NULL,
  `sets` INT NOT NULL DEFAULT 3,
  `reps` INT NOT NULL DEFAULT 12,
  `duration_minutes` INT NOT NULL DEFAULT 15,
  `rest_seconds` INT NOT NULL DEFAULT 60,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`workout_plan_id`) REFERENCES `workout_plans`(`id`) ON DELETE CASCADE,
  INDEX `idx_workout_plan_day` (`workout_plan_id`, `day_of_week`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 12. Table: schedules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `trainer_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `session_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('SCHEDULED', 'ATTENDED', 'CANCELLED', 'RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED',
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE,
  INDEX `idx_sched_trainer_conflict` (`trainer_id`, `session_date`, `start_time`, `end_time`),
  INDEX `idx_sched_member_conflict` (`member_id`, `session_date`, `start_time`, `end_time`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 13. Table: conversations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_a_id` INT NOT NULL,
  `user_b_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_message_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_a_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_b_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_conversation_pair` (`user_a_id`, `user_b_id`),
  INDEX `idx_conv_users` (`user_a_id`, `user_b_id`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 14. Table: messages
-- Super encrypted: Plaintext -> Vigenere -> AES-256-GCM.
-- Stored in ciphertext_payload JSON envelope with nonce and auth_tag.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `conversation_id` INT NOT NULL,
  `sender_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `ciphertext_payload` LONGTEXT NOT NULL, -- JSON envelope with encrypted payload
  `nonce` VARCHAR(32) NOT NULL, -- 12-byte nonce (Base64)
  `auth_tag` VARCHAR(32) NOT NULL, -- 16-byte tag (Base64)
  `vigenere_hint` VARCHAR(50) NULL, -- Optional non-secret hint or empty
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_msg_conv` (`conversation_id`),
  INDEX `idx_msg_recip_read` (`recipient_id`, `is_read`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 15. Table: files
-- ChaCha20-Poly1305 encrypted file storage metadata.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `files` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `uploader_id` INT NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `stored_filename` VARCHAR(255) NOT NULL, -- Stored inside /storage/encrypted_files/
  `file_size_bytes` BIGINT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `sha256_original_hash` VARCHAR(64) NOT NULL, -- SHA-256 integrity verification
  `nonce` VARCHAR(32) NOT NULL, -- Base64 96-bit nonce
  `auth_tag` VARCHAR(32) NOT NULL, -- Base64 128-bit Poly1305 tag
  `category` ENUM('CERTIFICATE', 'TRAINER_DOC', 'CONTRACT', 'OPERATIONAL') NOT NULL DEFAULT 'CERTIFICATE',
  `is_confidential` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_files_uploader` (`uploader_id`),
  INDEX `idx_files_category` (`category`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 16. Table: steganography
-- LSB image steganography operation history.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `steganography` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `original_image_name` VARCHAR(255) NOT NULL,
  `stego_image_path` VARCHAR(255) NOT NULL,
  `payload_size_bytes` INT NOT NULL,
  `magic_header` VARCHAR(10) NOT NULL DEFAULT 'GVST',
  `checksum` VARCHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_stego_user` (`user_id`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 17. Table: blockchain
-- Integrity ledger with SHA-256 hash chaining.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blockchain` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `block_index` BIGINT NOT NULL UNIQUE,
  `timestamp` BIGINT NOT NULL,
  `asset_id` VARCHAR(100) NOT NULL,
  `asset_type` VARCHAR(50) NOT NULL, -- PAYMENT, MEMBERSHIP, CERTIFICATE
  `asset_canonical_hash` VARCHAR(64) NOT NULL,
  `previous_hash` VARCHAR(64) NOT NULL,
  `block_hash` VARCHAR(64) NOT NULL UNIQUE,
  `is_tampered` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_block_index` (`block_index`),
  INDEX `idx_block_asset` (`asset_id`, `asset_type`),
  INDEX `idx_block_hash` (`block_hash`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 18. Table: dongles
-- USB Security Dongle device binding.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dongles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `device_hardware_id` VARCHAR(100) NOT NULL,
  `vendor_id` VARCHAR(20) NOT NULL,
  `product_id` VARCHAR(20) NOT NULL,
  `shared_secret_encrypted` TEXT NOT NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `last_used_at` DATETIME NULL,
  `registered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_dongle_user` (`user_id`),
  INDEX `idx_dongle_hw` (`device_hardware_id`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 19. Table: biometric_credentials
-- Face recognition 512-d embeddings stored encrypted with AES-256-GCM.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `biometric_credentials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `face_embedding_encrypted` TEXT NOT NULL,
  `embedding_nonce` VARCHAR(32) NOT NULL,
  `embedding_tag` VARCHAR(32) NOT NULL,
  `model_version` VARCHAR(50) NOT NULL DEFAULT 'MobileFaceNet-ONNX-v1',
  `confidence_threshold` DECIMAL(4, 3) NOT NULL DEFAULT 0.650,
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 20. Table: activity_logs
-- General activity audit trail.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_act_user_date` (`user_id`, `created_at`),
  INDEX `idx_act_action` (`action`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 21. Table: encryption_keys_metadata
-- Records key versions and metadata (never stores actual secret key).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `encryption_keys_metadata` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_identifier` VARCHAR(100) NOT NULL UNIQUE,
  `algorithm` VARCHAR(50) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rotated_at` DATETIME NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 22. Table: security_events
-- Security incidents and audit alerts.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `security_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_type` VARCHAR(100) NOT NULL, -- AUTH_LOCKOUT, TAG_MISMATCH, BLOCKCHAIN_TAMPER, USB_REMOVAL
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `description` TEXT NOT NULL,
  `source_ip` VARCHAR(45) NULL,
  `payload_snapshot` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sec_event_severity` (`severity`),
  INDEX `idx_sec_event_date` (`created_at`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
