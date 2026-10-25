-- A note's content can never change, but the database itself may still clear its author (the foreign key
-- ON DELETE SET NULL is an UPDATE). The first version of the trigger refused that too.
DROP TRIGGER lead_note_no_update ON "LeadNote";
CREATE TRIGGER lead_note_no_update BEFORE UPDATE ON "LeadNote" FOR EACH ROW
  WHEN (OLD."body" IS DISTINCT FROM NEW."body" OR OLD."leadId" IS DISTINCT FROM NEW."leadId" OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt")
  EXECUTE FUNCTION tastino_append_only();
