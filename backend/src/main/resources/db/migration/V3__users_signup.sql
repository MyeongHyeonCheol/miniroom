-- Signup (docs/erd.md users). Logged in but not signed up = nickname is null; the signup form sits over the room.
alter table users
  add column nickname             varchar(12),
  add column age_confirmed_at     timestamptz,
  add column terms_agreed_at      timestamptz,
  add column privacy_agreed_at    timestamptz,
  add column guestbook_checked_at timestamptz,
  add column visitor_key          varchar(40),
  add column expansion_tickets    smallint not null default 0 check (expansion_tickets >= 0),
  -- Signed up means nickname and all three consents together, never a nickname without consent
  add constraint users_signup_complete check (
    (nickname is null) = (age_confirmed_at is null)
    and (nickname is null) = (terms_agreed_at is null)
    and (nickname is null) = (privacy_agreed_at is null)
  );
