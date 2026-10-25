-- Lead notes are append-only (US-009.3): once written they can be neither changed nor deleted
-- (deleting was already refused by lead_note_no_delete).
CREATE TRIGGER lead_note_no_update BEFORE UPDATE ON "LeadNote" FOR EACH ROW EXECUTE FUNCTION tastino_append_only();
