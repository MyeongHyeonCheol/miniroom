-- Terms of service and privacy policy as versioned rows, and who agreed to which version when (2026-10-02 decision:
-- the texts are shown inside signup, and the agreement history is kept in the database).
-- Bodies come from resources/terms at startup (TermsSeeder), not from migrations, so a draft can be edited until
-- someone has agreed to it. A published version is never changed: a change is a new version.
create table terms (
  id           bigint generated always as identity primary key,
  kind         varchar(16)  not null check (kind in ('terms', 'privacy')),
  version      int          not null check (version >= 1),
  title        varchar(100) not null,
  body         text         not null,
  effective_at timestamptz  not null,
  created_at   timestamptz  not null default now(),
  unique (kind, version)
);

create table terms_agreements (
  id        bigint generated always as identity primary key,
  user_id   bigint      not null references users (id) on delete cascade,
  terms_id  bigint      not null references terms (id),
  agreed_at timestamptz not null,
  unique (user_id, terms_id)
);

create index terms_agreements_terms on terms_agreements (terms_id);

-- The two agreement times on users are replaced by terms_agreements. Signed up = nickname and age confirmation.
-- Accounts that signed up before this get version 1 of both (their agreement time kept); the v1 rows are placeholders
-- here and get their text from TermsSeeder on the next start.
insert into terms (kind, version, title, body, effective_at)
select kind, 1, '', '', '2026-10-02T00:00:00+09:00' from (values ('terms'), ('privacy')) as k (kind)
where exists (select 1 from users where terms_agreed_at is not null);

insert into terms_agreements (user_id, terms_id, agreed_at)
select u.id, t.id, case t.kind when 'terms' then u.terms_agreed_at else u.privacy_agreed_at end
from users u join terms t on t.version = 1
where u.terms_agreed_at is not null;

alter table users drop constraint users_signup_complete;
alter table users drop column terms_agreed_at, drop column privacy_agreed_at;
alter table users add constraint users_signup_complete check ((nickname is null) = (age_confirmed_at is null));
