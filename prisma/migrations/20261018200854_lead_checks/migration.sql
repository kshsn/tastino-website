-- A lead needs a non-blank email and explicit consent (US-002.2, US-006.8).
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_email_not_blank" CHECK (length(btrim("email")) > 0);
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_consent_given" CHECK ("consent" = true);
