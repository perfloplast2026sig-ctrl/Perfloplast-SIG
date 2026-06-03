-- CreateTable
CREATE TABLE `ShiftSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `startTime` VARCHAR(5) NOT NULL,
    `endTime` VARCHAR(5) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShiftSchedule_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default shifts
INSERT INTO `ShiftSchedule` (`id`, `name`, `startTime`, `endTime`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('shift_manana_default', 'Manana', '06:00', '11:59', 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('shift_tarde_default', 'Tarde', '12:00', '17:59', 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('shift_noche_default', 'Noche', '18:00', '05:59', 3, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
