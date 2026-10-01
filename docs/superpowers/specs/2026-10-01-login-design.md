# 1단계 로그인 검증 설계

- 날짜: 2026-10-01
- 단계: 1단계 기술 검증 (개발 프로세스 문서 "로그인" 줄)
- 완료 기준: Spring Boot + Google OAuth2로 로그인 한 번 성공, 로그인 후 내 이메일이 화면에 표시

## 정한 것

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| DB | PostgreSQL 17 (MySQL 8에서 바꿈) | 기본 UTF-8(방명록 이모지), 배치 JSON을 `jsonb`로, `timestamptz`, 하루 1회 방문을 부분 인덱스로. 백엔드 코드가 없어 지금 바꾸는 비용이 가장 작음 |
| 실행 | `docker compose up`으로 `postgres` + `backend` | 사용자 요청. 이 PC에 JDK가 없어 백엔드도 컨테이너 안에서 빌드 |
| 백엔드 런타임 | Java 25 (LTS), Spring Boot 4.1.1, Gradle 9 (wrapper 포함) | Initializr가 3.x를 더 이상 제공하지 않고 3.5 OSS 지원이 끝남. 25가 현재 LTS |
| 로그인 | Spring Security OAuth2 Login (Google) + 서버 세션 쿠키 | 문서가 세션 쿠키 기준. JWT 안 씀 |
| 세션 저장 | 메모리 (1단계) | 백엔드를 다시 켜면 로그아웃됨. DB 세션은 개선 목록 |
| 스키마 | Flyway 마이그레이션 SQL, JPA `ddl-auto=validate` | 테이블 변경 기록을 처음부터 남김 |
| 프론트 연결 | Vite 프록시가 `/api`, `/oauth2`, `/login`, `/logout`을 백엔드 8080으로 | 같은 주소로 보여 쿠키와 CORS 문제 없음 |
| 프록시 뒤 주소 | Vite `xfwd: true` + Spring `server.forward-headers-strategy=framework` | OAuth 리디렉션 주소가 `localhost:8080`이 아니라 `localhost:5173`으로 만들어지게 |

## 구성

```
miniroom/
├── docker-compose.yml        # postgres, backend
├── .env.example              # 키 이름만
├── .env                      # 실제 값 (커밋 안 함)
└── backend/
    ├── Dockerfile            # gradle 빌드 단계 → JRE 실행 단계
    ├── build.gradle, settings.gradle, gradlew
    └── src/main/
        ├── java/com/miniroom/
        │   ├── MiniroomApplication.java
        │   ├── auth/SecurityConfig.java       # OAuth2 로그인, /api/** 401, 로그아웃
        │   ├── auth/GoogleLoginSuccess.java   # 로그인 성공 시 users 저장/갱신 후 프론트로
        │   ├── user/User.java, UserRepository.java
        │   └── user/MeController.java         # GET /api/me
        └── resources/
            ├── application.yml
            └── db/migration/V1__users.sql
```

### 컨테이너

- `postgres`: `postgres:17`, 볼륨 `pgdata`, `TZ=Asia/Seoul`, `PGTZ=Asia/Seoul`, `pg_isready` healthcheck. 포트 5432는 로컬에서 확인용으로만 연다.
- `backend`: `backend/Dockerfile`로 빌드, `TZ=Asia/Seoul`, `postgres`가 healthy일 때 시작, 포트 8080.

### 환경 변수 (`.env`)

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`(기본 `http://localhost:5173`).

### 테이블

```sql
create table users (
  id            bigint generated always as identity primary key,
  google_sub    varchar(64)  not null unique,
  email         varchar(320) not null,
  created_at    timestamptz  not null default now(),
  last_login_at timestamptz  not null default now()
);
```

닉네임, 방, 약관 동의, `visitor_key`는 3단계 1주차 작업에서 추가한다.

## 흐름

1. 프론트의 "Google로 로그인" 버튼이 `/oauth2/authorization/google`로 이동한다.
2. Google 로그인 후 `/login/oauth2/code/google`(프록시 경유)로 돌아온다.
3. 성공 처리기가 `google_sub`로 사용자를 찾아 없으면 만들고, 있으면 `email`, `last_login_at`을 갱신한 뒤 `FRONTEND_URL`로 보낸다.
4. 프론트는 `GET /api/me`를 TanStack Query로 불러 `{ email }`이면 이메일과 로그아웃 버튼, 401이면 로그인 버튼을 보여준다.
5. 로그아웃은 `POST /logout`(CSRF 토큰 포함) 후 `/api/me`를 다시 불러온다.

## API

| 메서드 | 경로 | 로그인 | 응답 |
| --- | --- | --- | --- |
| GET | `/api/me` | 필요 | 200 `{ "email": "..." }`, 비로그인 401 (로그인 페이지로 리디렉션하지 않음) |
| GET | `/oauth2/authorization/google` | 아니요 | Spring Security 제공 |
| POST | `/logout` | 필요 | 204 |
| GET | `/swagger-ui.html`, `/v3/api-docs` | 아니요 | springdoc |

CSRF: 쿠키 방식(`CookieCsrfTokenRepository`, `XSRF-TOKEN` 쿠키 → `X-XSRF-TOKEN` 헤더). 1단계에서 쓰는 변경 요청은 로그아웃뿐이다.

## 확인

- Google 키 없이: 두 컨테이너 기동, Flyway V1 적용(`\dt`로 `users` 확인), `/api/me` 401, Swagger 열림, 로그인 버튼이 Google 로그인 페이지로 이동(키가 비면 Google 오류 페이지까지).
- Google 키를 넣은 뒤: 실제 로그인 성공, 화면에 이메일 표시, `users`에 행 1개, 다시 로그인하면 행이 늘지 않고 `last_login_at`만 바뀜, 로그아웃 후 401.
- 백엔드 테스트(컨테이너 안 Gradle): `/api/me` 비로그인 401, 로그인 상태(`oauth2Login()` 목) 200. DB가 필요 없는 슬라이스 테스트로 둔다.
- 프론트: `tsc`, `lint`, 기존 e2e. 개발 서버에 백엔드가 없을 때도 방 화면이 그대로 뜨는지(로그인 영역만 숨김).

## 하지 않는 것 (이번 범위 밖)

닉네임과 첫 가입 화면, 약관 동의, 방 자동 생성, 로그인 후 원래 방으로 복귀, DB 세션, 배포 환경 쿠키 설정. 모두 3단계 작업이다.

## 같이 고칠 문서

- `AGENTS.md`: 기술 스택 DB 줄, 폴더 구조 `docker-compose.yml` 설명, 백엔드 명령 추가
- `docs/3D 미니룸 MVP 개발 프로세스.md`: MySQL 표기와 TZ 설명, JSON 컬럼을 `jsonb`로
- `docs/improvements.md`: 백엔드 로컬 실행(JDK 설치), DB 세션 저장
