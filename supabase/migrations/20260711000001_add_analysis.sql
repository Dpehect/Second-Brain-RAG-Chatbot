-- Migration to add analysis feedback column to documents
alter table public.documents add column if not exists analysis text;
