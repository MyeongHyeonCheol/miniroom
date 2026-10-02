-- Metrics events (docs/erd.md events). PRD metrics are plain SQL over this table, visits and guestbook.
-- user_id and room_id survive account deletion as null, so counts stay without identifying anyone.
create table events (
  id          bigint generated always as identity primary key,
  type        varchar(32) not null check (type in ('share_open', 'mobile_notice', 'signup', 'session_start', 'furniture_move')),
  user_id     bigint      references users (id) on delete set null,
  visitor_key varchar(40),
  room_id     bigint      references rooms (id) on delete set null,
  ref         varchar(64),
  device      varchar(8)  check (device in ('pc', 'mobile')),
  created_at  timestamptz not null default now()
);

create index events_type_created_at on events (type, created_at);
create index events_user_created_at on events (user_id, created_at);
