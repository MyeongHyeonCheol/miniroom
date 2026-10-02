-- One room per user, made at first login (docs/erd.md rooms). Furniture lives in the layout jsonb, not in rows.
create table rooms (
  id         bigint generated always as identity primary key,
  slug       char(8)     not null unique check (slug ~ '^[a-z0-9]{8}$'),
  owner_id   bigint      not null unique references users (id) on delete cascade,
  size       smallint    not null default 12 check (size in (12, 16, 20, 24)),
  -- The app validates the content against the furniture catalog; the database only caps the size (10 KB budget)
  layout     jsonb       not null check (octet_length(layout::text) <= 10240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts that logged in before rooms existed get one now. md5 hex is a subset of [a-z0-9].
-- Same starting layout as RoomService.DEFAULT_LAYOUT.
insert into rooms (slug, owner_id, layout)
select substr(md5(random()::text || id::text), 1, 8), id,
       '{"v":1,"floor":"wood","wall":"ivory","backdrop":"island","items":[{"id":"bed","x":0,"y":0,"r":0},{"id":"computer_desk","x":3,"y":0,"r":0},{"id":"plant_pot","x":6,"y":0,"r":0}]}'::jsonb
from users;
