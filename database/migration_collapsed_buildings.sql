-- Migration: Add collapsed_buildings columns to cases table
USE lasambus_db;

ALTER TABLE cases
  ADD COLUMN collapsed_buildings      SMALLINT UNSIGNED DEFAULT NULL AFTER situation_on_arrival,
  ADD COLUMN desc_collapsed_buildings TEXT              DEFAULT NULL AFTER collapsed_buildings;
