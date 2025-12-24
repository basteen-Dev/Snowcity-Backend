-- Migration to add meta_title to attractions and combos tables
-- Run this on the database

ALTER TABLE attractions ADD COLUMN meta_title VARCHAR(255);
ALTER TABLE combos ADD COLUMN meta_title VARCHAR(255);