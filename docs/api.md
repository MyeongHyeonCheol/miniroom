# API 명세 (MVP, 초안)

2단계 설계의 두 번째 문서다. `docs/screens.md`(화면 흐름)가 요구하는 데이터에서 나왔고, 개발 프로세스 문서의 "API 명세 초안" 표를 대신한다. 구현하면서 springdoc(Swagger, `/swagger-ui.html`)으로 옮기고, 이 문서와 Swagger가 다르면 Swagger에 맞춰 이 문서를 고친다.

- 상태: 초안 (2026-10-01). 열린 질문은 추천안으로 결정. 방 크기는 방마다 다르다(기본 12×12, 최대 24×24). 배치 검증은 그 방의 크기로 한다.
- 이미 구현된 것: `GET /api/me`(1단계 형태), 로그인, 로그아웃, 세션. 표에 **구현됨**으로 적었다.

## 공통 규칙

| 항목 | 규칙 |
| --- | --- |
| 경로 | REST는 `/api/...`. 방은 외부에 순번 ID 대신 랜덤 `slug`(8자리 영숫자 소문자, 예: `k3x9m2qa`)로만 |
| 형식 | 요청, 응답 모두 JSON(UTF-8). 필드 이름은 camelCase |
| 로그인 | 서버 세션 쿠키 `SESSION`(Spring Session, PostgreSQL). 로그인이 필요한 API에 세션이 없으면 `401` |
| CSRF | 쓰기 요청(POST, PUT, PATCH, DELETE)은 `XSRF-TOKEN` 쿠키 값을 `X-XSRF-TOKEN` 헤더로 보낸다. 없거나 다르면 `403` |
| 시각 | ISO-8601, 한국 시간 오프셋을 붙인다: `2026-10-01T15:23:00+09:00`. "오늘"과 "하루"는 KST 0시 기준 |
| 사용자 입력 | 서버는 문자열을 그대로 저장하고 프론트는 텍스트로만 그린다(HTML로 해석하지 않음). 앞뒤 공백은 서버가 잘라 저장 |
| 공개 정보 | 다른 사람에게 보이는 사용자 정보는 닉네임과 방 slug뿐. 이메일, Google 이름은 응답에 넣지 않는다 |
| 오류 | 아래 "오류 형식" |
| 목록 | 커서 방식: `?cursor=`(이전 응답의 `nextCursor`), `nextCursor`가 `null`이면 끝 |

### 오류 형식

Spring의 `ProblemDetail`(RFC 9457)에 `code`를 더한다. 프론트는 `code`로 분기하고, `detail`은 개발자용이다(화면 문구는 프론트가 `code`로 고른다).

```json
{
  "status": 422,
  "code": "LAYOUT_OVERLAP",
  "detail": "items[3] overlaps items[1]",
  "errors": [{ "index": 3, "code": "LAYOUT_OVERLAP" }]
}
```

| 상태 | 쓰는 때 | 대표 `code` |
| --- | --- | --- |
| 400 | 형식이 틀림(JSON 아님, 필드 타입) | `BAD_REQUEST` |
| 401 | 로그인 필요, 세션 만료 | `UNAUTHORIZED`, `REPLACED`(다른 곳에서 로그인. 본문은 지금 `{"reason":"replaced"}`, 이 형식으로 맞춘다) |
| 403 | 권한 없음, 가입 미완료, CSRF | `FORBIDDEN`, `SIGNUP_REQUIRED`, `CSRF` |
| 404 | 없는 방, 없는 글 | `ROOM_NOT_FOUND`, `ENTRY_NOT_FOUND` |
| 409 | 이미 가입함(약관 재동의 시도 등) | `ALREADY_SIGNED_UP` |
| 422 | 값 검증 실패 | 각 API의 표 |
| 429 | 너무 자주 | `RATE_LIMITED`(헤더 `Retry-After`: 초) |

## 목록

| 메서드 | 경로 | 로그인 | 설명 | 상태 |
| --- | --- | --- | --- | --- |
| GET | `/oauth2/authorization/google` | 아니요 | Google 로그인 시작(Spring Security) | 구현됨 |
| POST | `/logout` | 예 | 로그아웃, `204` | 구현됨 |
| GET | `/api/me` | 예 | 내 정보 | 1단계 형태 구현됨, 바뀜 |
| PATCH | `/api/me` | 예 | 첫 가입(닉네임 + 14세 + 약관), 이후 닉네임 변경 | |
| DELETE | `/api/me` | 예 | 탈퇴 | |
| GET | `/api/rooms/{slug}` | 예(가입) | 방 보기 (로그인 필수(2026-10-01 사용자 결정)) | |
| PUT | `/api/rooms/me/layout` | 예(가입) | 내 방 바닥, 벽지, 배치 저장 | |
| POST | `/api/rooms/{slug}/visits` | 예(가입) | 방문 기록, 투데이/토탈 | |
| GET | `/api/rooms/{slug}/guestbook` | 예(가입) | 방명록 목록 | |
| POST | `/api/rooms/{slug}/guestbook` | 예(가입) | 방명록 쓰기 | |
| DELETE | `/api/guestbook/{entryId}` | 예 | 방명록 삭제(방 주인 또는 글쓴이) | |
| POST | `/api/rooms/me/guestbook/checked` | 예(가입) | 내 방 새 글 개수를 0으로 | 새로 추가 |
| POST | `/api/events` | 아니요 | 지표 이벤트 | |
| GET | `/s/{slug}` | 아니요 | 공유 링크(HTML, OG 태그) | |

"예(가입)"은 로그인하고 첫 가입(닉네임, 14세, 약관)까지 마쳐야 한다는 뜻이다. 가입 전이면 `403 SIGNUP_REQUIRED`.

## 사용자

### `GET /api/me`

```json
{
  "nickname": "명현",
  "needsSignup": false,
  "mySlug": "k3x9m2qa",
  "newGuestbookCount": 3
}
```

- 가입 전: `{ "nickname": null, "needsSignup": true, "mySlug": null, "newGuestbookCount": 0 }`.
- **초안에서 바뀐 점**: 1단계의 `{ "email" }`을 없앤다. 공개 화면에 이메일을 쓰지 않으므로 응답에도 두지 않는다(로그인 확인용이었음). 프론트의 이메일 표시는 닉네임으로 바꾼다.

### `PATCH /api/me`

첫 가입:

```json
{ "nickname": "명현", "ageConfirmed": true, "termsAgreed": true, "privacyAgreed": true }
```

이후 닉네임 변경: `{ "nickname": "새닉네임" }`. 응답은 `GET /api/me`와 같다.

| 검증 | `code` |
| --- | --- |
| 닉네임: 앞뒤 공백을 자른 뒤 2~12자, 줄바꿈·제어 문자 없음, 중복 허용 | `NICKNAME_INVALID` |
| 첫 가입인데 `ageConfirmed`, `termsAgreed`, `privacyAgreed` 중 하나라도 `true`가 아님 | `CONSENT_REQUIRED` |
| 가입한 뒤 동의 항목을 다시 보냄 | 무시(닉네임만 반영) |

- 첫 가입이 성공하면 같은 트랜잭션에서 **내 방을 만든다**(새 slug, 기본 가구 몇 개 배치).
- **초안에서 바뀐 점**: 초안은 "첫 로그인 때 내 방 자동 생성"이었다. 14세 미만은 가입할 수 없으므로 가입을 마친 순간에 만든다. 로그인만 하고 떠난 계정에 빈 방이 쌓이지 않는다.
- 동의 시각은 `age_confirmed_at`, `terms_agreed_at`, `privacy_agreed_at`으로 기록한다(ERD).

### `DELETE /api/me`

- 계정, 내 방(방의 방명록과 방문 기록 포함), 내가 다른 방에 쓴 방명록을 지운다. 세션을 모두 끝낸다. `204`.
- 지표용 `events`의 `user_id`는 지우지 않고 `null`로 바꾼다(개인 식별 없이 집계 유지).

## 방

### `GET /api/rooms/{slug}`

```json
{
  "slug": "k3x9m2qa",
  "owner": { "nickname": "명현" },
  "isMine": false,
  "size": 12,
  "limits": { "pieces": 45, "wallSlotsPerWall": 3 },
  "layout": {
    "v": 1,
    "floor": "wood",
    "wall": "ivory",
    "backdrop": "island",
    "items": [
      { "id": "bed", "x": 0, "y": 0, "r": 90 },
      { "id": "poster_cat", "slot": 2 }
    ]
  },
  "visits": { "today": 5, "total": 128 },
  "updatedAt": "2026-10-01T15:23:00+09:00"
}
```

- `layout`은 1단계 프로토타입의 저장 형식 그대로다(`frontend/src/room/layoutJson.ts`).
  - 바닥 가구, 러그: `{ id, x, y, r }`. `x`, `y`는 기준 칸(회전 후 차지하는 칸의 왼쪽 위), `r`은 0/90/180/270.
  - 벽 장식: `{ id, slot }`. 벽 한 면의 슬롯 수는 `size / 4`. 번호는 방을 넓혀도 바뀌지 않게 정한다: 크기 단계마다 새로 생긴 슬롯을 기존 번호 뒤에 붙인다. 12×12는 왼쪽 벽 0~2, 뒤쪽 벽 3~5. 16×16으로 넓히면 왼쪽 벽 6, 뒤쪽 벽 7. 20×20은 8, 9. 24×24는 10, 11. 벽 위 위치는 프론트가 번호에서 계산한다.
  - `backdrop`: 방 바깥 배경(바닥, 벽지처럼 방마다 하나). 없으면 기본 배경. 기본 하나는 무료, 나머지는 베타 도토리 상점 아이템(2026-10-01 사용자 결정). 종류는 배경 목록 JSON으로 관리하고 아직 정하지 않았다(앱 안 시안 비교 중).
  - 가구 종류는 가구 목록 JSON의 `category`로 구분한다(`large`, `prop`, `rug`, `wall`). 백엔드는 프론트와 같은 JSON을 리소스로 둔다.
- 없는 slug: `404 ROOM_NOT_FOUND`.
- `isMine`: 로그인 사용자가 주인이면 `true`. 프론트가 `/api/me`와 맞춰 보지 않아도 된다.
- `size`: 한 변의 칸 수(12, 16, 20, 24). `limits.pieces`: 그 크기의 가구 상한(45, 60, 90, 120).
- 방 넓히기 API(MVP는 확장권, 베타는 도토리)는 상점 설계 때 정한다. 서버는 `size`만 늘리고 배치는 그대로 둔다(좌표가 그대로 유효함).

### `PUT /api/rooms/me/layout`

본문은 위의 `layout` 그대로. 응답은 `GET /api/rooms/{slug}`와 같다.

서버는 프론트와 같은 규칙으로 **전체를 다시 검사**하고, 하나라도 틀리면 저장하지 않는다(1단계 불러오기처럼 틀린 가구만 빼지 않음. 저장은 사용자가 고칠 수 있으므로 거절이 맞다).

| 검증 | `code` |
| --- | --- |
| 본문 10KB 초과 | `LAYOUT_TOO_LARGE` |
| `v`가 1이 아님 | `LAYOUT_VERSION` |
| 모르는 바닥, 벽지, 배경, 가구 `id` (베타: 갖고 있지 않은 유료 아이템도 거절) | `LAYOUT_UNKNOWN_ID` |
| 가구가 그 방 크기의 상한 초과(벽 장식 포함) | `LAYOUT_TOO_MANY` |
| `r`이 0/90/180/270이 아님, `x`·`y`가 정수가 아님 | `LAYOUT_BAD_VALUE` |
| 방(`size`×`size`칸) 밖 | `LAYOUT_OUT_OF_ROOM` |
| 칸이 겹침(러그는 다른 가구와 겹쳐도 됨, 러그끼리는 안 됨) | `LAYOUT_OVERLAP` |
| 벽 장식 `slot`이 그 방 크기에 없는 번호이거나 같은 슬롯에 둘 | `LAYOUT_BAD_SLOT` |

`errors[].index`로 문제가 된 가구를 알려 준다(화면에서 그 가구를 표시).

## 방문

### `POST /api/rooms/{slug}/visits`

본문 없음. 응답:

```json
{ "today": 6, "total": 129, "counted": true }
```

- 방문자는 사용자 ID로 구분한다(로그인 필수라 비로그인 방문이 없다).
- 같은 사용자는 같은 방에 KST 하루 1회만 센다(`counted: false`). DB 고유 제약 `(room_id, visit_date, user_id)`로 보장.
- 방 주인 본인은 세지 않는다.
- 로그인 전 쿠키 `mr_vk`(랜덤, `HttpOnly`, `SameSite=Lax`, 1년)는 지표에만 쓴다: `/s/{slug}`의 `share_open`과 모바일 안내의 `mobile_notice`에 붙이고, 가입할 때 `users.visitor_key`로 연결한다(초대 전환율).
- 방 보기 화면에 들어올 때 한 번 부른다. `GET /api/rooms/{slug}`에서 세지 않는 이유: 메신저 미리보기, 새로고침, 꾸미기 저장 후 다시 읽기를 방문으로 세지 않기 위해.

## 방명록

### `GET /api/rooms/{slug}/guestbook?cursor=`

최신순 20개.

```json
{
  "items": [
    {
      "id": 812,
      "author": { "nickname": "지수", "slug": "p7w2c9ze" },
      "body": "방 너무 귀엽다!",
      "createdAt": "2026-10-01T15:23:00+09:00",
      "canDelete": false
    }
  ],
  "nextCursor": "811"
}
```

- `author.slug`: 답방 링크(글쓴이 방). 글쓴이가 탈퇴했으면 글도 지워지므로 `author`는 늘 있다.
- `canDelete`: 로그인 사용자가 방 주인이거나 글쓴이면 `true`.
- 커서는 마지막 항목의 `id`. **초안에서 바뀐 점**: `?page=0` 대신 커서. 새 글이 계속 올라오는 목록에서 페이지 번호를 쓰면 다음 페이지에 같은 글이 또 나온다.

### `POST /api/rooms/{slug}/guestbook`

```json
{ "body": "방 너무 귀엽다!" }
```

응답 `201`, 목록 항목과 같은 모양.

| 검증 | `code` |
| --- | --- |
| 앞뒤 공백을 자른 뒤 1~200자 (PRD의 500자에서 줄임, 열린 질문 4) | `BODY_INVALID` |
| 같은 사용자가 최근 60초 안에 3개를 이미 씀(모든 방 합산) | `429 RATE_LIMITED`, `Retry-After` |
| 가입 전 | `403 SIGNUP_REQUIRED` |

- 내 방에도 쓸 수 있다(주인 한마디).
- 도배 방지는 DB에서 센다(그 사용자의 최근 60초 글 수). Redis 없이 MVP 규모에 충분하다.

### `DELETE /api/guestbook/{entryId}`

- 방 주인 또는 글쓴이만 `204`. 아니면 `403 FORBIDDEN`, 없으면 `404 ENTRY_NOT_FOUND`.

### `POST /api/rooms/me/guestbook/checked`

- 내 방 방명록 패널을 열 때 부른다. `guestbook_checked_at = now()`, `204`.
- 새 방명록 개수(`GET /api/me`의 `newGuestbookCount`) = 내 방에 남이 쓴 글 중 `created_at > guestbook_checked_at`인 것.

## 지표

### `POST /api/events`

```json
{ "type": "mobile_notice", "roomSlug": "k3x9m2qa", "ref": "share" }
```

- `type`: `share_open`, `mobile_notice`, `signup`, `session_start`, `furniture_move` 중 하나. 아니면 `422 EVENT_TYPE`.
- `share_open`은 `/s/{slug}`가, `signup`은 `PATCH /api/me` 첫 가입이, `session_start`는 로그인 사용자의 그날 첫 `GET /api/me`가 서버에서 직접 기록한다. 프론트가 보내는 것은 `mobile_notice`, `furniture_move`뿐이다.
- 기기(`device`: `pc`, `mobile`)는 서버가 User-Agent로 정한다. 사용자, `mr_vk`도 서버가 붙인다. `204`.

## 공유 링크

### `GET /s/{slug}`

- HTML을 돌려준다. `<meta property="og:title" content="{닉네임}님의 미니룸">`, 공통 `og:image`, `og:description`.
- 사람 브라우저는 곧바로 이동한다: PC면 `/r/{slug}`, 모바일이면 `/m?to={slug}`(User-Agent). 메신저 미리보기 로봇은 HTML만 읽는다.
- `share_open` 이벤트를 기록한다. 없는 slug면 시작 화면(`/`)으로.
- 닉네임은 HTML 이스케이프해서 넣는다(사용자 입력).

## 구현 순서 제안 (4단계 1주차)

1. 오류 형식(`ProblemDetail` + `code`)과 공통 예외 처리
2. `PATCH /api/me` 첫 가입 + 방 자동 생성 + `GET /api/me` 새 모양(프론트 이메일 표시를 닉네임으로)
3. `GET /api/rooms/{slug}`, `PUT /api/rooms/me/layout`(검증은 가구 목록 JSON을 백엔드 리소스로 공유)
4. 방문, 방명록, 지표, 공유 링크(4주차)

## 열린 질문

2026-10-01 사용자 결정: 4개 모두 **추천안으로** 한다(기본 가구는 지금 3종 + 러그, 닉네임 변경 제한 없음, 도배 방지는 모든 방 합산, 방명록 200자). 아래는 기록으로 남긴다.

1. **기본 가구**: 첫 방에 무엇을 놓을까? 추천: 침대, 책상, 화분(지금 있는 3종) + 러그 하나(가구 17종이 생기면 다시).
2. **닉네임 변경**: 언제든 바꿀 수 있게 할까, 횟수 제한을 둘까? 추천: MVP는 제한 없음(중복 허용이라 사칭 방지 효과도 없음).
3. **도배 방지 범위**: "1인당 1분에 3개"를 모든 방 합산으로 볼까(추천), 방마다 따로 볼까?
4. **방명록 글자 수**: 500자 그대로? 손글씨 폰트로 보이면 긴 글은 읽기 어려워서 200자도 고려할 만하다. design.md의 방명록 입력창은 `42/200` 예시를 쓰고 있어 둘이 다르다. 추천: 200자로 맞추기.
