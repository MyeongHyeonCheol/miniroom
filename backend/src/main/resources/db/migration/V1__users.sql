-- Stage-1 login check. Nickname, room and consent columns come in stage 3.
create table users (
  id            bigint generated always as identity primary key,
  google_sub    varchar(64)  not null unique,
  email         varchar(320) not null,
  created_at    timestamptz  not null default now(),
  last_login_at timestamptz  not null default now()
);
