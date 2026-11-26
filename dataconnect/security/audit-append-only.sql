-- Append-only audit history (doc 12 section 6; F8).
--
-- The connector never calls update or delete on audit rows, and the read API exposes no write
-- path. This trigger enforces the same rule in the database for every client, including direct
-- SQL. Apply it once per environment after the Data Connect schema is deployed:
--
--   psql "$DATABASE_URL" -f dataconnect/security/audit-append-only.sql
--
-- The local Data Connect emulator recreates its schema on start, so this file is not applied
-- automatically there; run it by hand to test the trigger. Rehearse in staging before production.

create or replace function afhomes_block_audit_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_event is append-only: % is not allowed (doc 12 section 6)', tg_op;
end;
$$;

drop trigger if exists audit_event_append_only on audit_event;
create trigger audit_event_append_only
before update or delete on audit_event
for each row execute function afhomes_block_audit_mutation();

-- Defense in depth: the application role may insert and select, never rewrite. Replace
-- <app_role> with the role Data Connect connects as in that environment.
--
-- revoke update, delete on audit_event from <app_role>;
