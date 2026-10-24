-- This is an empty migration.
-- Reference numbers for leads (TF-<year>-<number>): one shared counter, never reused.
CREATE SEQUENCE IF NOT EXISTS lead_reference_seq START 1;
