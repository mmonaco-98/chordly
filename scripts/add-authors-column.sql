-- Da eseguire una volta nello SQL editor di Supabase (la anon key non può fare DDL).
alter table songs add column if not exists authors text not null default '[]';

-- Rollback (dopo `npm run authors:restore -- --yes` per ripristinare `artist`):
-- alter table songs drop column authors;
