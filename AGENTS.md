# 3D 미니룸 (가칭)

내 3D 방을 꾸미고, 친구 방에 놀러 가 방명록을 남기는 웹 기반 3D 소셜 서비스다. 1인 개발 프로젝트.

- 제품 요구사항: `docs/3D 미니룸 커뮤니티 PRD (가칭).md`
- 개발 단계, API 명세, ERD: `docs/3D 미니룸 MVP 개발 프로세스.md`
- 화면 흐름(MVP 화면, 주소, 화면별 데이터): `docs/screens.md`
- API 명세(경로, 요청과 응답, 검증, 오류 형식): `docs/api.md`
- ERD(테이블, 제약, 인덱스, 마이그레이션 순서): `docs/erd.md`
- UI 디자인 시스템(폰트, 색, 컴포넌트, 상태): `docs/design.md`. 프론트 UI는 이 문서의 토큰만 쓴다
- 미뤄 둔 개선 사항: `docs/improvements.md`

규칙이 이 파일과 문서에서 다르면 문서가 기준이다. 작업 중 문서와 다르게 가야 할 이유가 생기면, 코드를 바꾸기 전에 먼저 알린다.

## 현재 단계

**4단계 MVP 구현 1주차(백엔드 기반)** 중이다(2026-10-02부터). 1단계 기술 검증, 2단계 설계(`docs/screens.md`, `docs/api.md`, `docs/erd.md`), 3단계 로컬 운영 리허설(`docs/deploy.md`, Caddy + `prod` 프로필로 로그인과 재시작 후 유지 확인)은 끝났다. 1주차에서 오류 형식, `GET`/`PATCH /api/me`, 첫 로그인 때 방 생성, 방 조회·저장 API(배치 검증)까지 했다. 1주차에 남은 것은 `events` 테이블(ERD V7)이고, 다음은 2주차 3D 방 보기(1단계 프론트 정리, API로 받은 배치로 렌더링, 방 위 가입 창)다. 실제 배포는 5단계에서 4단계 결과를 보고 정한다(2026-10-02 결정).

1단계 프론트 코드(`frontend/src`)는 버려도 되는 검증 코드였지만, 로그인·세션(백엔드)과 방 렌더링·배치 로직은 4단계에서 정리해 이어 쓴다. 정리 없이 기능을 덧붙이지 않는다.

단계가 바뀌면 이 섹션을 갱신한다.

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| 프론트엔드 | Vite + React + TypeScript, 3D는 React Three Fiber + drei (Three.js) |
| 프론트 스타일 | Tailwind CSS v4 (레이아웃용). 색, 글자, 둥글기, 그림자는 design.md 토큰만 `@theme`에 둔다. 컴포넌트 라이브러리(shadcn 등)는 쓰지 않는다 |
| 프론트 상태 | 클라이언트 상태(방 배치, UI)는 zustand, 서버 상태(방, 방명록 API)는 TanStack Query |
| 프론트 테스트 | E2E와 순수 로직 테스트는 Playwright (`frontend/e2e/`, `npm run test:e2e`) |
| 백엔드 | Spring Boot 4.x, Java 25, Gradle, Spring Security + Google OAuth2, JPA, Flyway |
| DB | PostgreSQL 17 (방 배치는 `jsonb` 컬럼) |
| 실행 | Docker Compose (`backend`, `postgres`). 백엔드도 컨테이너 안에서 빌드하므로 로컬 JDK가 없어도 된다 |
| 3D 에셋 | Blender (Python 스크립트로 생성) → glb → gltf-transform 압축 |

MVP에서는 Redis, WebSocket, MongoDB, S3를 넣지 않는다. 필요해 보이면 추가하기 전에 먼저 제안한다.

프론트 명령(`frontend/`에서): `npm run dev`(개발 서버, 같은 네트워크에서 접속 가능), `npm run build`, `npm run lint`, `npm run test:e2e`, `npm run measure`(개발 서버를 띄운 상태에서 fps, 드로우콜, 로딩 시간 측정. 두 번째 인자로 주소 뒤에 붙일 값, 예: `npm run measure -- http://localhost:5173 stress=30`), `npm run fonts:subset`(`assets/fonts/` 원본과 Gaegu를 글자 범위별 조각으로 나눠 `public/fonts/`와 `src/styles/fonts.css`를 다시 만듦).

백엔드 명령(저장소 루트에서): `docker compose up -d --build`(빌드, 테스트, 실행), `docker compose logs -f backend`, `docker compose down`(데이터는 볼륨 `pgdata`에 남음). 단위 테스트만: `docker build --target build backend`. 통합 테스트(실제 PostgreSQL의 `it` 스키마): `docker compose run --rm backend-test`. Git Bash에서 `/tmp` 같은 경로를 인자로 넘길 때는 `MSYS_NO_PATHCONV=1`을 앞에 붙인다(경로가 Windows 경로로 바뀜).

운영 리허설(`docs/deploy.md`): `frontend/`에서 `npm run build` 후 루트에서 `docker compose -f compose.prod.yml up -d --build`, `https://localhost`로 접속. 개발 구성과 따로 돌고 DB도 따로다.

## 폴더 구조

```
miniroom/
├── AGENTS.md            # 에이전트 규칙 (이 파일, 규칙의 원본)
├── CLAUDE.md            # AGENTS.md를 불러오기만 함. 내용을 추가하지 않는다
├── docker-compose.yml   # backend + postgres
├── compose.prod.yml     # 운영 구성: Caddy + backend(prod) + postgres
├── deploy/              # Caddyfile
├── frontend/            # Vite + React + Three.js
│   └── public/models/   # 압축된 glb
├── backend/             # Spring Boot
├── assets/
│   ├── blender/         # 가구 생성 Python 스크립트, .blend 원본
│   ├── export/          # 압축 전 glb
│   └── fonts/           # 폰트 원본 (나눈 결과는 frontend/public/fonts/)
└── docs/                # PRD, 개발 프로세스, API 명세, ERD
    └── worklog/         # 작업 기록 (날짜별 파일)
```

아직 없는 폴더는 해당 작업을 시작할 때 만든다.

## 3D 방과 가구 규칙

- 1칸 = 0.5m × 0.5m. 방은 정사각형이고 크기는 방마다 저장한다. 가입하면 **12×12칸(6×6m)**, 도토리로 4칸씩 넓혀 16×16, 20×20, **최대 24×24칸(12×12m)**. 줄이지는 않는다(2026-10-01 결정, 여럿이 함께 노는 공간).
- 넓힐 때는 앞쪽과 오른쪽(+x, +y)으로만 늘어난다. 벽은 뒤쪽(y = 0)과 왼쪽(x = 0)에 있으므로 기존 배치 좌표가 그대로 유효하다.
- 카메라는 쿼터뷰 고정 각도(회전 없음). 빈 바닥을 끌어 화면을 옮기고 휠로 확대·축소한다. 처음에는 방 전체가 화면에 들어오게 맞춘다. 보이는 벽은 2면.
- 가구 배치는 **기준 칸(왼쪽 위 칸의 x, y) + 회전(0/90/180/270)** 으로 저장한다. 중심점 좌표로 저장하지 않는다.
- 벽 장식은 슬롯 번호로만 저장한다. 벽 한 면의 슬롯 수 = 칸 수 ÷ 4(12칸이면 3개). 번호는 왼쪽 벽 먼저 0부터, 이어서 뒤쪽 벽. 방을 넓혀도 기존 번호가 바뀌지 않도록, 넓힐 때 생긴 슬롯은 기존 번호 뒤에 붙인다(정확한 번호 규칙은 `docs/api.md`).
- 겹침 판정은 칸 단위. 러그만 다른 가구와 겹칠 수 있고, 러그끼리는 겹치지 않는다.
- 가구는 쌓지 않는다. 붙어 있는 것은 한 세트(예: 책상 + CRT 모니터).
- 방당 가구는 벽 장식 포함, 방 크기별 상한: 12×12 → 45개, 16×16 → 60개, 20×20 → 90개, 24×24 → 120개.
- 가구 목록(ID, 이름, 크기, glb 경로)은 DB가 아니라 JSON 파일로 관리한다. 원본은 `backend/src/main/resources/catalog/furniture.json`(바닥·벽지·배경은 같은 폴더 `surfaces.json`)이고, 백엔드 배치 검증과 프론트가 같은 파일을 읽는다. 프론트 쪽으로 복사하지 않는다.

## 성능 예산

새 가구나 렌더링 코드를 만들면 아래 기준을 넘지 않는지 확인하고 수치를 보고한다.

| 항목 | 한도 |
| --- | --- |
| 가구 1개 | 삼각형 2,000개, glb 100KB, 텍스처 512px |
| 텍스처 | 모든 가구가 팔레트 텍스처 1장을 공유 |
| 방 1개 전체 에셋 | 압축 후 3MB |
| 드로우콜 | 방당 100회 (같은 가구는 인스턴싱). 방 크기와 가구 수가 늘어도 이 한도를 지킨다 |
| 프레임 | 내장 그래픽 노트북 30fps, 일반 데스크톱 60fps |
| 첫 화면 | 3초 이내 (방 윤곽 먼저, 가구는 순차 로딩) |
| 방 배치 JSON | 10KB |

## 백엔드와 API 규칙

- REST 경로는 `/api/...`. 방은 외부에 순번 ID 대신 랜덤 `slug`로만 노출한다.
- 공유 링크는 백엔드 `/s/{slug}`. 여기서 OG 태그를 내려주고 프론트 방 주소로 이동시킨다.
- 날짜와 "하루" 기준은 전부 한국 시간(KST). 컨테이너는 `TZ=Asia/Seoul`, 방문 날짜는 앱에서 KST로 계산해 저장한다.
- 사용자 입력(방명록, 닉네임)은 HTML로 해석하지 않는다. `dangerouslySetInnerHTML` 금지.
- 로그인 사용자의 Google 실명은 공개 화면에 노출하지 않고 닉네임만 쓴다.
- API 문서는 springdoc-openapi(Swagger)로 코드에서 생성한다.

## Blender MCP

- `mcp-for-blender`를 쓴다. Blender 3D 뷰포트 사이드바(`N`)의 MCP for Blender 탭에서 서버 시작 버튼("Start MCP Server" 또는 "Connect to Claude")을 눌러야 연결된다. 기본 포트는 9876.
- 도구 호출이 실패하면 Blender가 켜져 있는지, 서버가 시작됐는지 먼저 확인하라고 안내한다.
- MCP로 Blender를 바로 조작하기보다 `assets/blender/`에 Python 스크립트를 남기고 그 스크립트를 실행하는 방식을 우선한다. 같은 스타일로 가구를 다시 만들 수 있어야 하기 때문이다.
- 가구를 만들면 `assets/export/`에 glb로 내보낸 뒤 gltf-transform으로 압축해 `frontend/public/models/`에 두고, 삼각형 수, 파일 크기, 제작에 걸린 시간을 보고한다.

## 보안

- 비밀 값(Google OAuth 클라이언트 ID와 시크릿, DB 비밀번호)은 `.env`에만 두고 커밋하지 않는다.
- `.env.example`에는 키 이름만 적는다.

## 작업 방식

- 한 번에 큰 기능을 만들지 않는다. 개발 프로세스 문서의 표 한 줄 정도가 한 작업 단위다.
- 여러 파일을 바꾸는 작업이나 구조를 정하는 작업은 먼저 계획을 보여주고 확인받은 뒤 진행한다.
- 만든 것은 직접 실행해 확인하고, 확인한 방법과 결과(수치 포함)를 함께 보고한다. 확인하지 못했으면 못 했다고 말한다.
- 작업 중 범위 밖의 기능 개선, 성능, 개발 환경 문제를 발견하면 바로 고치지 않고 `docs/improvements.md`에 한 줄로 추가한다. 처리하면 상태를 바꾼다. 작업을 보고할 때 이번에 추가한 항목을 함께 알린다.
- 커밋은 `main` 브랜치에 기능 단위로 작게. 요청받았을 때만 커밋한다.
- 응답과 문서는 한국어로 쓴다. 코드 식별자와 커밋 메시지는 영어.
- 개발 환경은 Windows 11이다. 셸 명령은 Windows에서 동작하는지 고려한다.
- 규칙은 이 파일에만 적는다. `CLAUDE.md` 같은 도구별 파일에 규칙을 따로 쓰지 않는다.

## 작업 기록

**모든 작업이 끝날 때마다 `docs/worklog/YYYY-MM-DD.md`(KST 날짜)에 기록을 남긴다.** 질문에 답만 한 경우처럼 파일, 설정, 결정이 바뀌지 않았으면 남기지 않는다.

- 그날 파일이 없으면 만들고, 있으면 맨 아래에 항목을 추가한다. 이전 항목은 고치지 않는다.
- 기록은 작업을 마쳤다고 보고하기 전에 쓴다.
- 시각은 로컬 시계(KST)로 적는다. Git Bash의 `TZ=Asia/Seoul date`는 UTC를 돌려주므로 PowerShell의 `Get-Date`를 쓴다.
- 실패하거나 중간에 멈춘 작업도 기록한다. 결과에 무엇이 안 됐는지 적는다.

형식:

```markdown
## HH:MM 작업 제목

- **요청**: 사용자가 요청한 것 한 줄
- **한 일**: 실제로 한 작업
- **변경 파일**: `경로` (새로 만듦 / 수정 / 삭제)
- **확인**: 어떻게 확인했고 결과가 어땠는지 (fps, 크기 같은 수치 포함). 확인하지 못했으면 그렇다고 적는다
- **결정**: 이번 작업에서 정한 것과 이유 (없으면 생략)
- **다음**: 이어서 할 일, 남은 문제 (없으면 생략)
```
