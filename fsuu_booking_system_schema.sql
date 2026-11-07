-- ============================================================
-- FSUU Facilities & Equipment Booking System Database Schema
-- Database: fsuu (MySQL 8.0+ / MariaDB 10.3+)
-- Generated at: 2026-11-07 13:17:44
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- Table structure for `roles`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `departments`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `department_name` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `code` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `academic_terms`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `academic_terms`;
CREATE TABLE `academic_terms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `academic_year` varchar(255) NOT NULL,
  `semester` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `total_venue_bookings` int(10) unsigned NOT NULL DEFAULT 0,
  `total_equipment_borrowings` int(10) unsigned NOT NULL DEFAULT 0,
  `total_breaches` int(10) unsigned NOT NULL DEFAULT 0,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `academic_terms_closed_by_foreign` (`closed_by`),
  CONSTRAINT `academic_terms_closed_by_foreign` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `users`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint(20) unsigned NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `suffix` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `invite_token` varchar(255) DEFAULT NULL,
  `invited_at` timestamp NULL DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_address_unique` (`email_address`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_google_id_unique` (`google_id`),
  KEY `users_role_id_foreign` (`role_id`),
  KEY `users_created_by_foreign` (`created_by`),
  CONSTRAINT `users_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `personal_access_tokens`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `personal_access_tokens`;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `is_revoked` tinyint(1) NOT NULL DEFAULT 0,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_by` bigint(20) unsigned DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `sessions`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `password_reset_tokens`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `otp_hash` varchar(64) DEFAULT NULL,
  `attempts` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `password_reset_tokens_email_index` (`email`),
  KEY `password_reset_tokens_token_hash_index` (`token_hash`),
  KEY `password_reset_tokens_otp_hash_index` (`otp_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `verification_pin_settings`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `verification_pin_settings`;
CREATE TABLE `verification_pin_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `master_pin` varchar(255) DEFAULT NULL,
  `hashed_master_pin` varchar(255) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `require_outside_hours` tinyint(1) NOT NULL DEFAULT 1,
  `require_multi_day_venue` tinyint(1) NOT NULL DEFAULT 1,
  `require_multi_day_equipment` tinyint(1) NOT NULL DEFAULT 1,
  `require_external` tinyint(1) NOT NULL DEFAULT 1,
  `applicability_matrix` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applicability_matrix`)),
  `pin_mode` varchar(20) NOT NULL DEFAULT 'optional',
  `venue_verify_email` tinyint(1) NOT NULL DEFAULT 1,
  `venue_verify_phone` tinyint(1) NOT NULL DEFAULT 0,
  `equipment_verify_email` tinyint(1) NOT NULL DEFAULT 1,
  `equipment_verify_phone` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `security_alerts`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `security_alerts`;
CREATE TABLE `security_alerts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_type` varchar(255) NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `status` enum('unresolved','resolved','investigating','dismissed') NOT NULL DEFAULT 'unresolved',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `security_alerts_user_id_foreign` (`user_id`),
  KEY `security_alerts_resolved_by_foreign` (`resolved_by`),
  KEY `security_alerts_event_type_status_index` (`event_type`,`status`),
  KEY `security_alerts_created_at_index` (`created_at`),
  CONSTRAINT `security_alerts_resolved_by_foreign` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `security_alerts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `audit_logs`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `auditable_type` varchar(255) DEFAULT NULL,
  `auditable_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_auditable_type_auditable_id_index` (`auditable_type`,`auditable_id`),
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `operating_hours`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `operating_hours`;
CREATE TABLE `operating_hours` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `venue_open` time NOT NULL DEFAULT '07:00:00',
  `venue_close` time NOT NULL DEFAULT '17:00:00',
  `equipment_open` time NOT NULL DEFAULT '07:00:00',
  `equipment_close` time NOT NULL DEFAULT '17:00:00',
  `arrival_grace_mins` smallint(5) unsigned NOT NULL DEFAULT 15,
  `return_grace_mins` smallint(5) unsigned NOT NULL DEFAULT 30,
  `auto_cancel_mins` smallint(5) unsigned NOT NULL DEFAULT 30,
  `requirement_grace_hours` smallint(5) unsigned NOT NULL DEFAULT 24,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `system_settings`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `system_name` varchar(255) NOT NULL DEFAULT 'FSUU Facilities & Equipment Booking System',
  `organization_name` varchar(255) NOT NULL DEFAULT 'Father Saturnino Urios University',
  `header_brand_text` varchar(255) NOT NULL DEFAULT 'Urios',
  `contact_email` varchar(255) NOT NULL DEFAULT 'support.booking@fsuu.edu.ph',
  `contact_phone` varchar(255) NOT NULL DEFAULT '(085) 342-1830',
  `timezone` varchar(255) NOT NULL DEFAULT 'Asia/Manila (UTC+8)',
  `auto_shift_tomorrow_after_hours` tinyint(1) NOT NULL DEFAULT 1,
  `allow_advance_equipment_booking` tinyint(1) NOT NULL DEFAULT 1,
  `max_items_per_borrow` int(10) unsigned NOT NULL DEFAULT 5,
  `smtp_host` varchar(255) DEFAULT NULL,
  `smtp_port` int(10) unsigned DEFAULT 587,
  `smtp_username` varchar(255) DEFAULT NULL,
  `smtp_password` text DEFAULT NULL,
  `smtp_encryption` varchar(255) DEFAULT 'tls',
  `mail_from_address` varchar(255) DEFAULT NULL,
  `mail_from_name` varchar(255) DEFAULT NULL,
  `sms_api_key` varchar(255) DEFAULT NULL,
  `sms_api_url` varchar(255) DEFAULT NULL,
  `sms_sender_name` varchar(255) DEFAULT 'FSUU_AVR',
  `abstract_email_api_key` varchar(255) DEFAULT NULL,
  `facebook_url` varchar(255) DEFAULT 'https://www.facebook.com/fsuubutuan',
  `facebook_name` varchar(255) DEFAULT 'Father Saturnino Urios University',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `office_name` varchar(255) DEFAULT 'Audio-Visual Resource Center (AVRC)',
  `office_address` text DEFAULT NULL,
  `operating_hours` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `booking_requirements`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `booking_requirements`;
CREATE TABLE `booking_requirements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `classification` varchar(255) NOT NULL DEFAULT 'all',
  `label` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `template_file_url` text DEFAULT NULL,
  `template_file_name` varchar(255) DEFAULT NULL,
  `template_display_mode` varchar(255) NOT NULL DEFAULT 'download',
  `format_content` longtext DEFAULT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `rejection_reasons`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `rejection_reasons`;
CREATE TABLE `rejection_reasons` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rejection_reasons_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `violation_categories`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `violation_categories`;
CREATE TABLE `violation_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `violation_categories_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `fee_matrices`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `fee_matrices`;
CREATE TABLE `fee_matrices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `venue_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'Facility Rental Fee Schedule and Reservation Policy',
  `show_signatures` tinyint(1) NOT NULL DEFAULT 1,
  `show_rate_items` tinyint(1) NOT NULL DEFAULT 1,
  `notes_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `signatories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`signatories`)),
  `rate_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rate_items`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fee_matrices_venue_id_index` (`venue_id`),
  CONSTRAINT `fee_matrices_venue_id_foreign` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `venues`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `venues`;
CREATE TABLE `venues` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `avatar` longtext DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `capacity` int(11) NOT NULL DEFAULT 100,
  `min_capacity` int(11) DEFAULT 1,
  `max_capacity` int(11) DEFAULT 100,
  `allowed_equipment_types_id` text DEFAULT NULL,
  `allowed_equipment_units_qty` int(11) DEFAULT NULL,
  `allowed_equipment` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowed_equipment`)),
  `equipment_max_qtys` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`equipment_max_qtys`)),
  `status` varchar(255) NOT NULL DEFAULT 'available',
  `visible_in_venue_booking` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `venue_overrides`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `venue_overrides`;
CREATE TABLE `venue_overrides` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `venue_id` bigint(20) unsigned DEFAULT NULL,
  `override_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'maintenance',
  `start_time` varchar(20) NOT NULL DEFAULT '07:30',
  `end_time` varchar(20) NOT NULL DEFAULT '17:00',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `venue_date_override_unique` (`venue_id`,`override_date`),
  KEY `venue_overrides_created_by_foreign` (`created_by`),
  CONSTRAINT `venue_overrides_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `venue_overrides_venue_id_foreign` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `equipment_types`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_types`;
CREATE TABLE `equipment_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `equipment_types_name` varchar(255) DEFAULT NULL,
  `eq_name` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `photo_fit` varchar(20) NOT NULL DEFAULT 'contain',
  `photo_scale` int(11) NOT NULL DEFAULT 100,
  `status` varchar(255) NOT NULL DEFAULT 'available',
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `total_quantity` int(11) NOT NULL DEFAULT 1,
  `available_count` int(11) NOT NULL DEFAULT 1,
  `built_in_count` int(11) NOT NULL DEFAULT 0,
  `unavailable_count` int(11) NOT NULL DEFAULT 0,
  `reserved_count` int(11) NOT NULL DEFAULT 0,
  `damaged_count` int(11) NOT NULL DEFAULT 0,
  `lost_count` int(11) NOT NULL DEFAULT 0,
  `released_count` int(11) NOT NULL DEFAULT 0,
  `date_purchased` date DEFAULT NULL,
  `lifespan_years` int(11) NOT NULL DEFAULT 5,
  `description` text DEFAULT NULL,
  `built_in_units` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`built_in_units`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `brands`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `brands`;
CREATE TABLE `brands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `equipment_type_id` bigint(20) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brands_name_unique` (`name`),
  KEY `brands_equipment_type_id_foreign` (`equipment_type_id`),
  CONSTRAINT `brands_equipment_type_id_foreign` FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `equipment_units`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_units`;
CREATE TABLE `equipment_units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `equipment_type_id` bigint(20) unsigned DEFAULT NULL,
  `equipment_types_id` bigint(20) unsigned DEFAULT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `seq_no` varchar(255) DEFAULT NULL,
  `barcode` varchar(255) DEFAULT NULL,
  `purchased_at` date DEFAULT NULL,
  `eq_lifespan` int(11) NOT NULL DEFAULT 5,
  `status` varchar(255) NOT NULL DEFAULT 'available',
  `condition` varchar(255) NOT NULL DEFAULT 'Good',
  `description` text DEFAULT NULL,
  `built_in_units` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`built_in_units`)),
  `built_in_models` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`built_in_models`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `equipment_units_equipment_types_id_foreign` (`equipment_types_id`),
  KEY `eu_barcode_idx` (`barcode`),
  KEY `eu_stock_status_idx` (`equipment_type_id`,`status`,`condition`),
  CONSTRAINT `equipment_units_equipment_type_id_foreign` FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `equipment_units_equipment_types_id_foreign` FOREIGN KEY (`equipment_types_id`) REFERENCES `equipment_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=329 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `equipment_overrides`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_overrides`;
CREATE TABLE `equipment_overrides` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `override_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'closed',
  `start_time` varchar(20) NOT NULL DEFAULT '07:30',
  `end_time` varchar(20) NOT NULL DEFAULT '17:00',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `equipment_overrides_override_date_unique` (`override_date`),
  KEY `equipment_overrides_created_by_foreign` (`created_by`),
  CONSTRAINT `equipment_overrides_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `tracking_numbers`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `tracking_numbers`;
CREATE TABLE `tracking_numbers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `reference_code` varchar(255) NOT NULL,
  `reservation_type` varchar(255) NOT NULL,
  `reservation_id` bigint(20) unsigned NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `rejected_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tracking_numbers_reference_code_unique` (`reference_code`),
  KEY `tracking_numbers_approved_by_foreign` (`approved_by`),
  KEY `tracking_numbers_rejected_by_foreign` (`rejected_by`),
  KEY `tn_status_idx` (`status`),
  KEY `tn_res_type_id_idx` (`reservation_type`,`reservation_id`),
  CONSTRAINT `tracking_numbers_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tracking_numbers_rejected_by_foreign` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `reference_counters`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `reference_counters`;
CREATE TABLE `reference_counters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `prefix` varchar(10) NOT NULL,
  `year_month` varchar(10) NOT NULL,
  `last_number` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ref_counters_prefix_ym_unique` (`prefix`,`year_month`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `venue_bookings`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `venue_bookings`;
CREATE TABLE `venue_bookings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `academic_term_id` bigint(20) unsigned DEFAULT NULL,
  `tracking_number_id` bigint(20) unsigned NOT NULL,
  `venue_id` bigint(20) unsigned NOT NULL,
  `submission_channel` varchar(255) NOT NULL DEFAULT 'online_self',
  `first_name` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `suffix` varchar(255) DEFAULT NULL,
  `filer_name` varchar(255) DEFAULT NULL,
  `email_address` varchar(255) NOT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `program_office` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) NOT NULL,
  `classification` varchar(255) NOT NULL,
  `place_of_use` varchar(255) NOT NULL DEFAULT 'inside',
  `purpose` text NOT NULL,
  `equipment_types` text DEFAULT NULL,
  `equipment_units` text DEFAULT NULL,
  `equipment_notes` text DEFAULT NULL,
  `no_of_person` int(11) NOT NULL,
  `date_of_usage` date NOT NULL,
  `reservation_end_date` date DEFAULT NULL,
  `extend_reservation_end_date` date DEFAULT NULL,
  `time_start` time NOT NULL,
  `time_end` time NOT NULL,
  `agreed_to_policy` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `claim_timestamp` datetime DEFAULT NULL,
  `is_complete` tinyint(1) NOT NULL DEFAULT 1,
  `missing_requirements_remarks` text DEFAULT NULL,
  `missing_requirements_list` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`missing_requirements_list`)),
  `incomplete_at` timestamp NULL DEFAULT NULL,
  `incomplete_deadline_at` timestamp NULL DEFAULT NULL,
  `resubmitted_at` timestamp NULL DEFAULT NULL,
  `assigned_units` longtext DEFAULT NULL,
  `restricted_equipment` longtext DEFAULT NULL,
  `endorsement_url` varchar(255) DEFAULT NULL,
  `endorsement_letter` varchar(255) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  `is_auto_rejected` tinyint(1) NOT NULL DEFAULT 0,
  `auto_reject_winning_reference` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `venue_bookings_academic_term_id_foreign` (`academic_term_id`),
  KEY `venue_bookings_tracking_number_id_foreign` (`tracking_number_id`),
  KEY `venue_bookings_department_id_foreign` (`department_id`),
  KEY `venue_bookings_venue_id_date_of_usage_index` (`venue_id`,`date_of_usage`),
  KEY `venue_bookings_claim_timestamp_index` (`claim_timestamp`),
  KEY `vb_collision_check_idx` (`venue_id`,`date_of_usage`,`reservation_end_date`,`time_start`,`time_end`),
  KEY `vb_antispam_idx` (`venue_id`,`created_at`,`date_of_usage`),
  CONSTRAINT `venue_bookings_academic_term_id_foreign` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `venue_bookings_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `venue_bookings_tracking_number_id_foreign` FOREIGN KEY (`tracking_number_id`) REFERENCES `tracking_numbers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `venue_bookings_venue_id_foreign` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `venue_booking_equipment`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `venue_booking_equipment`;
CREATE TABLE `venue_booking_equipment` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `venue_booking_id` bigint(20) unsigned NOT NULL,
  `equipment_type_id` bigint(20) unsigned DEFAULT NULL,
  `equipment_types_id` bigint(20) unsigned DEFAULT NULL,
  `quantity_requested` int(11) NOT NULL DEFAULT 1,
  `others_specify` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `venue_booking_equipment_venue_booking_id_foreign` (`venue_booking_id`),
  KEY `venue_booking_equipment_equipment_type_id_foreign` (`equipment_type_id`),
  KEY `venue_booking_equipment_equipment_types_id_foreign` (`equipment_types_id`),
  CONSTRAINT `venue_booking_equipment_equipment_type_id_foreign` FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `venue_booking_equipment_equipment_types_id_foreign` FOREIGN KEY (`equipment_types_id`) REFERENCES `equipment_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `venue_booking_equipment_venue_booking_id_foreign` FOREIGN KEY (`venue_booking_id`) REFERENCES `venue_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `equipment_borrows`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_borrows`;
CREATE TABLE `equipment_borrows` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `academic_term_id` bigint(20) unsigned DEFAULT NULL,
  `tracking_number_id` bigint(20) unsigned NOT NULL,
  `submission_channel` varchar(255) NOT NULL DEFAULT 'online_self',
  `first_name` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `suffix` varchar(255) DEFAULT NULL,
  `filer_name` varchar(255) DEFAULT NULL,
  `email_address` varchar(255) NOT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `program_office` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) NOT NULL,
  `classification` varchar(255) NOT NULL,
  `place_of_use` varchar(255) NOT NULL DEFAULT 'inside',
  `purpose` text NOT NULL,
  `date_of_usage` date NOT NULL,
  `extend_of_date_returned` date DEFAULT NULL,
  `time_start` time NOT NULL,
  `time_end` time NOT NULL,
  `equipment_units_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `returned_at` timestamp NULL DEFAULT NULL,
  `assigned_units` longtext DEFAULT NULL,
  `restricted_equipment` longtext DEFAULT NULL,
  `endorsement_url` varchar(255) DEFAULT NULL,
  `endorsement_letter` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `equipment_borrows_academic_term_id_foreign` (`academic_term_id`),
  KEY `equipment_borrows_tracking_number_id_foreign` (`tracking_number_id`),
  KEY `equipment_borrows_department_id_foreign` (`department_id`),
  KEY `equipment_borrows_date_of_usage_index` (`date_of_usage`),
  KEY `eb_schedule_idx` (`date_of_usage`,`time_start`,`time_end`),
  KEY `eb_email_created_idx` (`email_address`,`created_at`),
  CONSTRAINT `equipment_borrows_academic_term_id_foreign` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `equipment_borrows_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `equipment_borrows_tracking_number_id_foreign` FOREIGN KEY (`tracking_number_id`) REFERENCES `tracking_numbers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `equipment_borrow_items`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_borrow_items`;
CREATE TABLE `equipment_borrow_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `equipment_borrow_id` bigint(20) unsigned NOT NULL,
  `equipment_type_id` bigint(20) unsigned DEFAULT NULL,
  `equipment_types_id` bigint(20) unsigned DEFAULT NULL,
  `equipment_unit_id` bigint(20) unsigned DEFAULT NULL,
  `equipment_units_id` bigint(20) unsigned DEFAULT NULL,
  `quantity_requested` int(11) NOT NULL DEFAULT 1,
  `picked_up_at` timestamp NULL DEFAULT NULL,
  `returned_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `equipment_borrow_items_equipment_borrow_id_foreign` (`equipment_borrow_id`),
  KEY `equipment_borrow_items_equipment_type_id_foreign` (`equipment_type_id`),
  KEY `equipment_borrow_items_equipment_types_id_foreign` (`equipment_types_id`),
  KEY `equipment_borrow_items_equipment_unit_id_foreign` (`equipment_unit_id`),
  KEY `equipment_borrow_items_equipment_units_id_foreign` (`equipment_units_id`),
  CONSTRAINT `equipment_borrow_items_equipment_borrow_id_foreign` FOREIGN KEY (`equipment_borrow_id`) REFERENCES `equipment_borrows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `equipment_borrow_items_equipment_type_id_foreign` FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `equipment_borrow_items_equipment_types_id_foreign` FOREIGN KEY (`equipment_types_id`) REFERENCES `equipment_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `equipment_borrow_items_equipment_unit_id_foreign` FOREIGN KEY (`equipment_unit_id`) REFERENCES `equipment_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `equipment_borrow_items_equipment_units_id_foreign` FOREIGN KEY (`equipment_units_id`) REFERENCES `equipment_units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `documents`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `venue_booking_id` bigint(20) unsigned DEFAULT NULL,
  `reservation_type` varchar(255) DEFAULT NULL,
  `reservation_id` bigint(20) unsigned DEFAULT NULL,
  `equipment_borrow_id` bigint(20) unsigned DEFAULT NULL,
  `document_type` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `uploaded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `documents_venue_booking_id_foreign` (`venue_booking_id`),
  KEY `docs_eb_id_idx` (`equipment_borrow_id`),
  CONSTRAINT `documents_venue_booking_id_foreign` FOREIGN KEY (`venue_booking_id`) REFERENCES `venue_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `inspections`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `inspections`;
CREATE TABLE `inspections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inspectable_type` varchar(255) DEFAULT NULL,
  `inspectable_id` bigint(20) unsigned DEFAULT NULL,
  `inspected_by` bigint(20) unsigned NOT NULL,
  `inspection_type` varchar(255) NOT NULL,
  `equipment_types` text DEFAULT NULL,
  `equipment_unit` text DEFAULT NULL,
  `condition` varchar(255) NOT NULL,
  `is_late` tinyint(1) NOT NULL DEFAULT 0,
  `timeliness` varchar(255) NOT NULL DEFAULT 'on_time',
  `minutes_late` int(11) NOT NULL DEFAULT 0,
  `violation_type` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `evidence_photo` longtext DEFAULT NULL,
  `assigned_units` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`assigned_units`)),
  `unit_conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`unit_conditions`)),
  `inspected_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inspections_inspected_by_foreign` (`inspected_by`),
  KEY `insp_inspectable_idx` (`inspectable_type`,`inspectable_id`),
  KEY `insp_type_idx` (`inspection_type`),
  CONSTRAINT `inspections_inspected_by_foreign` FOREIGN KEY (`inspected_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `email_verifications`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `email_verifications`;
CREATE TABLE `email_verifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `channel` varchar(20) NOT NULL DEFAULT 'email',
  `phone_number` varchar(50) DEFAULT NULL,
  `otp_code` varchar(10) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_verifications_email_index` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `phone_verifications`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `phone_verifications`;
CREATE TABLE `phone_verifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(255) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `phone_verifications_phone_number_index` (`phone_number`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `communication_logs`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `communication_logs`;
CREATE TABLE `communication_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `channel` varchar(255) NOT NULL DEFAULT 'email',
  `category` varchar(255) NOT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `recipient_phone` varchar(255) DEFAULT NULL,
  `reference_code` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message_preview` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'sent',
  `error_message` text DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `communication_logs_category_index` (`category`),
  KEY `communication_logs_recipient_email_index` (`recipient_email`),
  KEY `communication_logs_reference_code_index` (`reference_code`)
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `notification_reads`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `notification_reads`;
CREATE TABLE `notification_reads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `notification_key` varchar(255) DEFAULT NULL,
  `text` text DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `read_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_reads_user_id_foreign` (`user_id`),
  KEY `notification_reads_notification_key_index` (`notification_key`),
  CONSTRAINT `notification_reads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
