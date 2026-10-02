# 운영 구성과 리허설

실제 배포는 5단계에서 4단계 결과를 보고 정한다(2026-10-02 결정). 그전까지는 같은 구성을 내 컴퓨터에서 띄워 운영 환경에서만 드러나는 문제(HTTPS 쿠키, 프록시 뒤 주소, CSRF, Swagger 닫힘)를 미리 확인한다.

평소 개발은 지금처럼 `npm run dev` + `docker compose up -d`로 한다. 리허설은 로그인·쿠키·라우팅을 바꿨을 때, 4단계 매주 끝에 한 번씩 돌린다.

## 구조 (도메인 하나)

```
브라우저 ──HTTPS──> Caddy (web, 80/443)
                     ├─ /api/*, /oauth2/*, /login/*, /logout, /s/*  →  backend:8080 (prod 프로필)  →  postgres
                     └─ 나머지                                        →  frontend/dist (없는 주소는 index.html)
```

- 로컬 Vite 프록시와 같은 경로 나눔이라 세션 쿠키가 1st-party이고 CORS가 필요 없다.
- `backend`와 `postgres`는 밖으로 포트를 열지 않는다. 백엔드는 `X-Forwarded-*` 헤더를 믿으므로 Caddy만 백엔드에 닿아야 한다.
- 프로젝트 이름이 `miniroom-prod`라 컨테이너와 볼륨(DB, 인증서)이 개발용과 따로다. 개발 구성과 동시에 띄워도 된다(포트가 겹치지 않음).

| 파일 | 역할 |
| --- | --- |
| `compose.prod.yml` | Caddy + 백엔드 + PostgreSQL. 백엔드 메모리 1GB 상한, 힙은 그 70% |
| `deploy/Caddyfile` | HTTPS, 경로 나눔, 캐시 헤더(`/assets/*` 1년, glb·폰트 하루, 페이지는 매번 확인), gzip·zstd |
| `backend/src/main/resources/application-prod.yml` | 세션 쿠키 `Secure`, Swagger·API 문서 끔 |

## 리허설 실행

`.env`는 개발과 같은 파일을 쓴다(`POSTGRES_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 필요). `SITE_HOST`, `SITE_URL`은 비워 두면 `localhost`, `https://localhost`.

```sh
cd frontend && npm run build && cd ..
docker compose -f compose.prod.yml up -d --build
```

`https://localhost`로 접속한다. 프론트를 고치면 `npm run build`만 다시 하면 된다(컨테이너 재시작 불필요). 백엔드를 고치면 `up -d --build`를 다시 한다. 끄기는 `docker compose -f compose.prod.yml down`(데이터는 볼륨에 남음).

Google Cloud Console의 승인된 리디렉션 URI에 `https://localhost/login/oauth2/code/google`이 있어야 로그인된다(2026-10-02 등록함).

### 인증서 경고 없애기 (선택)

Caddy는 `localhost`에 자체 인증서를 발급하므로 브라우저가 처음에 경고한다. "계속"을 눌러도 쿠키와 로그인은 정상 동작한다. 경고를 없애려면 Caddy의 루트 인증서를 내 Windows 계정에만 신뢰 등록한다(PowerShell).

```powershell
docker compose -f compose.prod.yml cp web:/data/caddy/pki/authorities/local/root.crt caddy-root.crt
certutil -user -addstore Root caddy-root.crt
Remove-Item caddy-root.crt
```

인증서는 `caddy-data` 볼륨에 있어 재시작해도 그대로다. 볼륨을 지우면 새 루트가 만들어지므로 다시 등록한다. 지울 때는 `certutil -user -delstore Root "Caddy Local Authority"`.

## 확인 목록

| 항목 | 방법 | 기대 결과 |
| --- | --- | --- |
| 첫 화면, 방 주소 | `curl -sk https://localhost/`, `/r/아무거나` | 둘 다 200, `index.html` |
| HTTP → HTTPS | `curl -s -o /dev/null -w "%{http_code}" http://localhost/` | 308 |
| 캐시 | 응답 헤더 `Cache-Control` | `/assets/*`는 `max-age=31536000, immutable`, 페이지는 `no-cache` |
| 로그인 안 한 API | `curl -sk https://localhost/api/me` | 401 |
| 쿠키 | `curl -sk -D - -o /dev/null https://localhost/oauth2/authorization/google` | `SESSION`에 `Secure; HttpOnly; SameSite=Lax`, `XSRF-TOKEN`에 `Secure` |
| Google 리디렉션 주소 | 위 응답의 `Location` | `redirect_uri=https://localhost/login/oauth2/code/google` |
| CSRF | 토큰 없이 `POST /logout` / `X-XSRF-TOKEN` 헤더와 함께 | 403 / 204 |
| Swagger 닫힘 | 네트워크 안에서 백엔드 직접: `docker run --rm --network miniroom-prod_default curlimages/curl -s -o /dev/null -w "%{http_code}" http://backend:8080/v3/api-docs` | 404 (Caddy로 부르면 `/swagger-ui`는 프론트 화면이 나옴) |
| 포트 | `docker compose -f compose.prod.yml ps` | `web`만 80/443을 열고, `backend`·`postgres`는 열지 않음 |
| 브라우저 로그인 | `https://localhost`에서 Google 로그인 | 로그인 상태로 표시, 개발자 도구 쿠키에 `Secure` |
| 재시작 후 유지 | `docker compose -f compose.prod.yml restart backend` 후 새로고침 | 로그인 그대로 |
| 1곳 로그인 | 다른 브라우저(또는 시크릿 창)로 같은 계정 로그인 | 먼저 로그인한 쪽이 다음 요청 때 안내와 함께 로그아웃 |

자동 테스트로는 `ProdProfileIT`(통합 테스트)가 `prod` 프로필의 `Secure` 쿠키와 Swagger 닫힘을 확인한다.

## 실제 서버로 옮길 때 (5단계, 배포하기로 하면)

리허설 구성을 그대로 쓰고 아래만 바꾼다.

- **도메인**: `.env`에 `SITE_HOST=도메인`, `SITE_URL=https://도메인`. Caddy가 Let's Encrypt 인증서를 스스로 받는다(80/443이 열려 있어야 함)
- **Google**: 리디렉션 URI `https://도메인/login/oauth2/code/google` 추가, OAuth 동의 화면을 "프로덕션"으로
- **프론트 빌드**: 서버에 Node를 두지 않으려면 빌드 결과를 올리거나 이미지로 만든다(그때 정함)
- **아직 없는 것**: 서버 상태 확인 주소, DB 백업과 복원 연습, 자동 배포, Cloudflare 앞단. 5단계에서 추가
