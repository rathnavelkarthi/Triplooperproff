-- Database Schema for Ganesh Residency CRM & CMS

-- On shared hosting like Hostinger, the database is already created via cPanel.
-- We just need to create the tables inside it.
-- Table `staff`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `staff` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `status` enum('ACTIVE','ON_LEAVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table `reservations`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `guestName` varchar(100) NOT NULL,
  `roomType` varchar(50) NOT NULL,
  `checkIn` date NOT NULL,
  `checkOut` date NOT NULL,
  `status` enum('CONFIRMED','PENDING','CHECKED_IN','CHECKED_OUT','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paymentStatus` enum('PAID','PARTIAL','PENDING') NOT NULL DEFAULT 'PENDING',
  `amount` decimal(10,2) NOT NULL,
  `source` enum('DIRECT','BOOKING.COM','AGODA','MAKE_MY_TRIP') NOT NULL DEFAULT 'DIRECT',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- --------------------------------------------------------
-- Table `settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` varchar(50) NOT NULL PRIMARY KEY,
  `setting_value` text NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Initial Data for Settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('heroTitle', 'A Sanctuary by the Shore'),
('heroSubtitle', 'Experience unparalleled tranquility where the ocean meets luxury at Ganesh Residency.'),
('contactAddress', '123 Coastal Highway, Beach Road\\nPondicherry 605001\\nIndia'),
('contactPhone', '+91 98765 43210'),
('contactEmail', 'reservations@ganeshresidency.com'),
('aboutText', 'Perfectly situated to offer tranquility while keeping the vibrant culture of Pondicherry within easy reach.');

-- --------------------------------------------------------
-- Aadhar & Guest Profile fields (MySQL Compatibility)
-- --------------------------------------------------------
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `aadhar_url` text;
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `aadhar_number` varchar(50);
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `aadhar_extracted_age` int;
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `aadhar_extracted_address` text;
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `aadhar_extracted_name` varchar(100);
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `aadhar_dob` varchar(50);

CREATE TABLE IF NOT EXISTS `guest_profiles` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `phone` varchar(20) NOT NULL UNIQUE,
  `email` varchar(100),
  `name` varchar(100),
  `aadhar_url` text,
  `aadhar_number` varchar(50),
  `aadhar_extracted_age` int,
  `aadhar_extracted_address` text,
  `aadhar_extracted_name` varchar(100),
  `aadhar_dob` varchar(50),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
