# 디자인 시스템

3D 미니룸 프론트엔드의 UI 기준이다. 버튼, 패널, 방명록처럼 화면 위에 올라가는 모든 UI는 이 문서의 토큰과 컴포넌트 규칙을 따른다. 새 색이나 크기가 필요하면 코드에 값을 바로 쓰지 말고 이 문서에 토큰을 먼저 추가한다.

## 방향

레퍼런스는 [Messenger (abeto)](https://messenger.abeto.co/)다. 작은 행성, 파스텔 색, 둥근 말풍선, 손글씨 같은 부드러움을 가져오되, 우리 서비스는 2000년대 초 자취방 미니룸이므로 한 톤 더 따뜻하게 간다.

UI는 **공책에 볼펜으로 그린 듯한** 모양이다(2026-10-01, 앱 안에서 연필 / 스티커 / 색연필 시안을 비교해 연필로 정함).

- **따뜻한 흰색**: 순백과 순흑을 쓰지 않는다. 배경은 크림, 글자는 짙은 갈색.
- **볼펜 선**: 카드, 버튼, 타일은 `ink` 색 2px 선으로 그린다. 선은 살짝 일렁이고, 모서리는 둥글되 네 귀퉁이가 조금씩 다르다. 번지는 그림자 대신 연필 빗금으로 그림자를 칠한다.
- **눌리는 버튼**: 버튼 아래에 두께가 있고, 누르면 두께만큼 내려간다.
- **가구와 같은 색**: UI 주요 색은 가구 팔레트(`assets/blender/common.py`)와 같은 계열을 쓴다. 침대 이불의 하늘색이 곧 주요 버튼 색이다.
- **3D가 주인공**: UI는 방을 가리지 않는다. 패널은 가장자리에 붙이고, 반투명하지 않은 흰 카드로 띄운다.

레퍼런스에서 확인한 값: 주요 색 `#66BDE6`(하늘), `#647A87`(슬레이트), `#F3C258`(노랑), `#C25959`(빨강), `#DE794E`(주황), `#8CC48C`(초록), 본문 폰트 REM, 말풍선 폰트 UglyDave(손글씨). REM과 UglyDave는 한글이 없어서 아래처럼 한글 폰트로 바꾼다.

## 폰트

| 역할 | 폰트 | 굵기 | 쓰는 곳 |
| --- | --- | --- | --- |
| 기본 (UI, 본문) | **나눔스퀘어라운드** (NanumSquareRound) | 400, 700, 800 | 버튼, 탭, 입력창, 본문, 숫자 등 제목을 뺀 모든 UI |
| 손글씨 (제목, 포인트) | **Gaegu** (Google Fonts) | 400, 700 | 제목(`display`, `title`, `heading`)은 700. 방명록 글 본문, 방 안 말풍선, 빈 상태 안내 문구는 400 |
| 숫자 (측정, 개수) | 기본 폰트 + `font-variant-numeric: tabular-nums` | - | 가구 개수 `12/30`, 방문자 수 |

```css
font-family: "NanumSquareRound", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
font-family: "Gaegu", "NanumSquareRound", cursive; /* 손글씨 */
```

- 폰트 파일은 `frontend/public/fonts/`에 woff2로 두고 직접 서빙한다(외부 CDN 의존 없음, 첫 화면 3초 예산).
- 폰트는 글자 범위별 조각으로 나눠 `unicode-range`로 등록한다. 브라우저는 화면에 나온 글자가 든 조각만 받는다. 글자를 잘라내지 않으므로 드문 글자도 같은 폰트로 보인다. 원본은 `assets/fonts/`, 나누기는 `npm run fonts:subset`(`fonts.css`도 이 명령이 만든다). 라이선스 전문은 `frontend/public/licenses/`.
- `font-display: swap`. Gaegu 700은 제목이라 첫 화면에 쓰인다. Gaegu 400은 방명록을 열 때 불러와도 된다.
- 손글씨는 제목, 사용자 글, 분위기 문구에만 쓴다. 버튼, 메뉴, 경고, 숫자에는 쓰지 않는다(읽기 어려움). 본문까지 Gaegu로 바꾼 시안은 글자 사이가 벌어지고 줄이 넘어가서 뺐다.
- Gaegu는 같은 px에서 나눔스퀘어라운드보다 작아 보이고 한글 글자 사이가 넓다. 그래서 제목 토큰은 한 단계 크게, 자간은 좁게 잡는다.

## 글자 크기, 행간, 자간

한글은 기본 자간이 넓어 보여서 제목일수록 조금 좁힌다. 행간은 본문 1.6 전후.

| 토큰 | 크기 | 행간 | 자간 | 굵기 | 쓰는 곳 |
| --- | --- | --- | --- | --- | --- |
| `display` | 40px | 44px (1.1) | -0.1em | 700 Gaegu | 랜딩 제목, 방 주인 닉네임(방 입장 시) |
| `title` | 32px | 36px (1.13) | -0.1em | 700 Gaegu | 모달 제목, 패널 제목 |
| `heading` | 24px | 28px (1.17) | -0.08em | 700 Gaegu | 섹션 제목, 카드 제목 |
| `body` | 16px | 26px (1.6) | -0.01em | 400 | 기본 본문 |
| `body-strong` | 16px | 26px | -0.01em | 700 | 강조 본문 |
| `label` | 15px | 20px | -0.01em | 700 | 버튼, 탭, 입력창 라벨 |
| `small` | 14px | 22px (1.57) | -0.005em | 400 | 보조 설명, 가구 이름 |
| `caption` | 12px | 18px (1.5) | 0 | 400 | 날짜, 도움말, 배지 |
| `hand` | 20px | 30px (1.5) | 0 | 400 | 방명록 글, 말풍선 (Gaegu는 작아 보여서 한 단계 크게) |

- 최소 글자 크기는 12px.
- 한 줄 길이는 본문 기준 최대 36자(한글) 정도로 끊는다. 패널 폭 360px에서 자연스럽게 맞는다.

## 색

### 기본 색

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `bg` | `#FFF9F0` | 페이지 배경, 3D 캔버스 바깥 |
| `surface` | `#FFFFFF` | 카드, 패널, 모달, 입력창 |
| `surface-sunken` | `#F4ECE0` | 입력창 안쪽이 아닌 움푹한 영역, 탭 트랙, 비활성 칸 |
| `border` | `#EADFD2` | 카드 테두리, 구분선 |
| `border-strong` | `#D9CBBB` | 입력창 테두리 |
| `ink` | `#3D3530` | 기본 글자 (bg 위 대비 11.5) |
| `ink-soft` | `#7A6E66` | 보조 글자 (bg 위 대비 4.7, AA) |
| `ink-faint` | `#9A8D82` | 비활성 글자, 플레이스홀더 (대비 3.1, 본문에는 쓰지 않음) |

### 역할 색

주요 버튼 글자는 흰색이 아니라 `ink`다. 하늘색 위 흰 글자는 대비 2.1로 읽기 어렵고, 짙은 갈색 글자가 더 따뜻해 보인다.

| 역할 | 기본 | 마우스 올림 (hover) | 누름 (active) | 연한 배경 (subtle) | 글자 | 쓰는 곳 |
| --- | --- | --- | --- | --- | --- | --- |
| `primary` 하늘 | `#66BDE6` | `#57B2DD` | `#4EA9D5` | `#E3F3FB` | `ink` (5.7 / 5.0 / 4.6) | 저장, 방명록 남기기, 방 만들기 |
| `accent` 노랑 | `#F3C258` | `#E6B040` | `#DBA430` | `#FDF3D8` | `ink` (7.2) | 새 방명록 배지, 오늘 방문자, 강조 표시 |
| `success` 초록 | `#8CC48C` | `#7DB87D` | `#6FAD6F` | `#E6F3E4` | `ink` (5.9) | 저장 완료, 배치 가능 |
| `danger` 빨강 | `#B84E4E` | `#A94444` | `#9E3E3E` | `#FBEFEC` | `#FFFFFF` (5.0 / 5.8 / 6.5) | 삭제, 신고 |
| `neutral` 슬레이트 | `#647A87` | `#586D7A` | `#4D616D` | `#EDF1F3` | `#FFFFFF` | 3D 위 떠 있는 아이콘 버튼 배경(선택) |
| `link` | `#276F94` | 밑줄 | `#1F5B7A` | - | - | 본문 안 링크 (bg 위 5.3) |

괄호 안 숫자는 글자 대비. 모두 WCAG AA(4.5) 이상이다.

### 3D 위 표시 색

가구 배치 중 칸에 겹쳐 그리는 색. 3D 머티리얼에 투명도로 쓴다.

| 토큰 | 값 | 투명도 | 뜻 |
| --- | --- | --- | --- |
| `cell-hover` | `#FFFFFF` | 0.35 | 마우스가 올라간 칸 |
| `cell-ok` | `#8CC48C` | 0.45 | 놓을 수 있음 |
| `cell-blocked` | `#E07A6B` | 0.5 | 겹쳐서 놓을 수 없음 |
| `furniture-selected` | `#66BDE6` | 외곽선 | 선택된 가구 테두리 |

색만으로 구분하지 않는다. 놓을 수 없을 때는 커서를 `not-allowed`로 바꾸고 짧은 안내 문구를 함께 띄운다.

## 모양

### 볼펜 선

카드, 버튼, 타일, 탭, 토스트, 입력창은 요소 자체가 아니라 그 뒤의 `::before` 층에 선과 바탕을 그리고, 그 층에만 SVG 필터를 걸어 선을 일렁이게 한다. 글자는 필터를 받지 않아 또렷하다. 필터는 `ui/SketchFilters.tsx`가 앱에 한 번만 넣는다.

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `sketch-line` | 2px `ink` | 카드, 버튼, 타일, 입력창의 선 |
| `sketch-wobble` | `url(#sketch-wobble)` (`feTurbulence` 0.035 + `feDisplacementMap` 5) | 버튼, 타일, 탭 알약, 토스트처럼 작은 것 |
| `sketch-wobble-soft` | `url(#sketch-wobble-soft)` (같은 노이즈, 세기 3) | 카드, 패널, 모달처럼 큰 것. 세기 5면 긴 변이 지글거림 |
| `sketch-radius-sm` | `18px 12px 16px 13px / 13px 16px 12px 18px` | 버튼, 입력창, 탭 알약 |
| `sketch-radius-md` | `22px 14px 20px 16px / 16px 20px 14px 22px` | 가구 타일 |
| `sketch-radius-lg` | `26px 16px 24px 18px / 18px 24px 16px 26px` | 카드, 패널, 모달, 말풍선 |
| `sketch-hatch` | `ink-soft` 1.2px 빗금, 5px 간격, -45°, 투명도 0.55 | 카드, 타일 아래 그림자 |
| `sketch-paper` | 갈색 노이즈 9% (SVG 데이터 URI, 160px 타일) | 카드, 버튼, 타일 바탕 위에 겹치는 종이 결 |

- 그림자: 카드는 `sketch-hatch`를 오른쪽 4px, 아래 5px로 어긋나게, 타일은 3px, 3px. 둘 다 같은 일렁임 필터를 건다.
- 버튼 두께: 아래 3px에 `ink`를 꽉 채운 같은 모양을 깐다. 누르면 두께가 사라지고 3px 내려간다.
- 점선(`dashed`)은 "덜 중요하거나 비어 있는 칸"이다: 탭 트랙, 비활성 버튼과 타일, 빈 슬롯.

### 둥글기

볼펜 선을 쓰지 않는 작은 요소(배지, 닉네임 태그, 안내 띠)에 쓴다.

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `radius-sm` | 8px | 배지, 체크박스, 작은 칩 |
| `radius-md` | 14px | 버튼, 입력창, 가구 타일 |
| `radius-lg` | 20px | 카드, 패널 |
| `radius-xl` | 28px | 모달, 말풍선 |
| `radius-pill` | 999px | 토글, 탭 트랙, 닉네임 태그 |

### 그림자

카드, 버튼, 타일은 번지는 그림자 대신 위의 연필 빗금과 두께를 쓴다. 아래 그림자는 선을 그리지 않는 것(3D 위 닉네임 태그 등)에만 쓴다. 검정이 아니라 갈색 기가 도는 색(`94 72 52`)을 쓴다.

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `shadow-sm` | `0 1px 2px rgb(94 72 52 / 0.08), 0 2px 6px rgb(94 72 52 / 0.06)` | 칩, 닉네임 태그 |
| `shadow-md` | `0 4px 14px rgb(94 72 52 / 0.10)` | 3D 위 떠 있는 작은 표시 |
| `shadow-lg` | `0 12px 32px rgb(94 72 52 / 0.16)` | 모달 뒤를 띄울 때만 (모달 자체는 빗금 그림자) |

### 간격

4px 단위. `space-1`=4, `space-2`=8, `space-3`=12, `space-4`=16, `space-5`=20, `space-6`=24, `space-8`=32, `space-10`=40, `space-12`=48.

- 카드 안쪽 여백 20px, 패널 안쪽 여백 24px.
- 화면 가장자리에서 UI까지 16px(작은 화면), 24px(데스크톱).

## 움직임

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `duration-fast` | 120ms | 버튼 누름, hover 색 변화 |
| `duration-base` | 200ms | 패널 열림, 탭 전환 |
| `duration-slow` | 320ms | 모달, 방 입장 연출 |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | 기본 |
| `ease-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 말풍선, 토스트, 배지가 톡 튀어나올 때 (살짝 넘쳤다 돌아옴) |

- `prefers-reduced-motion: reduce`이면 이동과 튕김을 끄고 투명도 변화만 남긴다.
- 가구를 놓을 때는 3D 쪽에서 살짝 내려앉는 연출(떨어지는 높이 5cm, 200ms, `ease-pop`)을 준다.

## 상호작용 상태

모든 클릭 가능한 요소는 아래 5가지 상태를 가진다.

| 상태 | 규칙 |
| --- | --- |
| 기본 | 역할 색 바탕 + `sketch-line`, 버튼은 아래 `ink` 두께 3px |
| 마우스 올림 (hover) | 바탕을 hover 색으로, 1px 위로 (`translateY(-1px)`) |
| 누름 (active) | 바탕을 누름 색으로, 아래 두께와 빗금 그림자를 지우고 `translateY(3px)` |
| 키보드 포커스 (focus-visible) | `primary-active` 2px 점선 `outline`, 바깥으로 5px 띄움. 마우스 클릭에는 보이지 않음 |
| 비활성 (disabled) | 바탕 `surface-sunken`, 선은 `ink-faint` 점선, 글자 `ink-faint`, 두께와 그림자 없음, `cursor: not-allowed` |
| 로딩 | 글자 자리에 점 3개가 차례로 통통 튀는 표시, 버튼 폭 유지, 클릭 막음 |

터치 영역은 최소 40×40px.

## 공통 컴포넌트

### 버튼 `Button`

| 종류 | 바탕 | 선 | 글자 | 아래 두께 | 쓰는 곳 |
| --- | --- | --- | --- | --- | --- |
| `primary` | `primary` | `sketch-line` | `ink` | `ink` 3px | 화면에서 가장 중요한 행동 1개 |
| `secondary` | `surface` + 종이 결 | `sketch-line` | `ink` | `ink` 3px | 취소, 보조 행동 |
| `ghost` | 투명 (hover 시 `surface-sunken`) | 없음 (hover 시 `ink-soft` 선) | `ink-soft` | 없음 | 패널 안 작은 행동, 더보기 |
| `danger` | `danger` | `sketch-line` | 흰색 | `ink` 3px | 삭제 확인 (확인 모달 안에서만) |

| 크기 | 높이 | 좌우 여백 | 글자 | 아이콘 |
| --- | --- | --- | --- | --- |
| `sm` | 32px | 12px | `small` 700 | 16px |
| `md` (기본) | 40px | 18px | `label` | 18px |
| `lg` | 48px | 24px | 16px 800 | 20px |

- 모서리 `sketch-radius-sm`, 일렁임 `sketch-wobble`. 아이콘과 글자 간격 6px.
- 한 화면에 `primary`는 하나만.

### 아이콘 버튼 `IconButton`

- 원형(`radius-pill`), 40×40(기본), 44×44(3D 위에 떠 있는 버튼).
- `surface` 바탕 + `sketch-line` + 아래 `ink` 두께 3px, `sketch-wobble`. 선이 있어서 3D 위에서도 방과 분리된다.
- 글자가 없으므로 `aria-label` 필수, hover 시 툴팁.

### 입력창 `TextField`, `TextArea`

- 높이 44px, 바탕 `surface`, 선 `ink-soft` 2px, 모서리 `sketch-radius-sm`, `sketch-wobble`, 안쪽 여백 12px 14px. 두께와 그림자는 없다(누르는 것이 아니므로).
- 포커스: 선 `ink`, 바탕 `primary-subtle`.
- 오류: 테두리 `danger`, 아래 `caption` 크기로 `danger` 색 안내.
- 방명록 `TextArea`는 글자에 `hand` 스타일, 오른쪽 아래에 글자 수 `caption` (`42/200`).
- 사용자 입력은 항상 텍스트로만 렌더링한다(`dangerouslySetInnerHTML` 금지, AGENTS.md 참고).

### 카드 `Card`, 패널 `Panel`

- 카드: `surface` + 종이 결, `sketch-line`, `sketch-radius-lg`, `sketch-wobble-soft`, 빗금 그림자(4px, 5px), 안쪽 20px.
- 패널(가구 목록, 방명록 목록): 화면 가장자리에 붙는 카드. 폭 360px(데스크톱), 안쪽 24px, 위에 `title` 제목과 닫기 `IconButton`.

### 가구 타일 `FurnitureTile`

가구 목록 패널의 한 칸.

- 88×88px, `surface` + 종이 결, `sketch-line`, `sketch-radius-md`, `sketch-wobble`, 빗금 그림자(3px, 3px), 가운데 가구 썸네일, 아래 `caption` 이름.
- hover: 1px 위로. 누름: 빗금 그림자가 사라짐.
- 선택됨: 바탕 `primary-subtle`.
- 개수 제한(30개) 도달 시 전체 비활성, 패널 위에 `accent-subtle` 안내 띠.

### 탭 `SegmentedControl`

바닥 3종, 벽지 3종 고르기처럼 몇 개 중 하나를 고를 때.

- 트랙: `surface-sunken` + 종이 결, `ink-soft` 1.5px 점선, `radius-pill`, 안쪽 4px.
- 선택된 칸: `primary-subtle` + `sketch-line` 알약(`sketch-radius-sm`, `sketch-wobble`)이 200ms `ease-out`으로 미끄러져 이동.
- 선택 안 된 칸 글자 `ink-soft`, 선택된 칸 `ink` 700.

### 말풍선 `SpeechBubble`

방 안에 뜨는 방명록 미리보기, 방 주인 한마디.

- `surface` + 종이 결, `sketch-line`, `sketch-radius-lg`, `sketch-wobble-soft`, 아래쪽 꼬리(12px 삼각형, 같은 선). 그림자 없음.
- 글자 `hand`, 닉네임은 위에 `caption` 700 `ink-soft`.
- 나타날 때 `scale 0.85 → 1`, `ease-pop`, 200ms.

### 방명록 항목 `GuestbookItem`

- 닉네임 태그(`radius-pill`, `primary-subtle` 배경, `small` 700) + 날짜 `caption` `ink-soft`(KST).
- 본문 `hand`. 항목 사이 구분선 `ink-faint` 1.5px 점선.
- 삭제 권한이 있으면 오른쪽에 `ghost` `sm` 버튼.

### 모달 `Modal`

- 카드와 같은 볼펜 선(`sketch-radius-lg`, `sketch-wobble-soft`, 빗금 그림자), 폭 최대 420px, 안쪽 28px.
- 뒤 배경 `rgb(61 53 48 / 0.35)` (ink 계열).
- 버튼은 오른쪽 정렬, `secondary` 먼저 `primary`(또는 `danger`) 나중.
- 열릴 때 아래 12px에서 올라오며 나타남 320ms.

### 토스트 `Toast`

- 화면 아래 가운데, `ink` 바탕 + `bg` 글자, 알약 모양에 `sketch-wobble`, 높이 44px. 선과 그림자 없음.
- 3초 뒤 사라짐. 성공/오류는 왼쪽 점 아이콘 색(`success`/`danger`)으로 구분.

### 닉네임 태그 `NameTag`

방 안 캐릭터 또는 방 주인 표시. `surface` 90% 불투명, `radius-pill`, `small` 700, 좌우 10px. Google 실명은 쓰지 않는다.

### 로딩

- 방 윤곽이 먼저 뜨고 가구는 순차 로딩(성능 예산). 가구가 뜨는 동안 해당 칸에 `surface-sunken` 색 둥근 자리표시를 둔다.
- 전체 로딩 표시는 점 3개가 통통 튀는 애니메이션. 회전하는 스피너는 쓰지 않는다.

## CSS 토큰

`frontend/src/styles/app.css`의 Tailwind `@theme`에 그대로 옮긴다. Tailwind 기본 색은 지워서 토큰 색만 유틸리티로 생긴다(`bg-primary`, `text-ink-soft`, `rounded-md`, `shadow-md`, `text-title`). Tailwind는 레이아웃(flex, grid, 간격, 위치)에 쓰고, 컴포넌트 모양은 `ui/ui.css`에서 이 변수로 만든다. 간격은 Tailwind 4px 단위가 `space-*`와 같다(`gap-2` = 8px).

```css
:root {
  /* font */
  --font-base: "NanumSquareRound", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --font-hand: "Gaegu", "NanumSquareRound", cursive;

  /* color: base */
  --color-bg: #FFF9F0;
  --color-surface: #FFFFFF;
  --color-surface-sunken: #F4ECE0;
  --color-border: #EADFD2;
  --color-border-strong: #D9CBBB;
  --color-ink: #3D3530;
  --color-ink-soft: #7A6E66;
  --color-ink-faint: #9A8D82;

  /* color: roles (default / hover / active / subtle) */
  --color-primary: #66BDE6;
  --color-primary-hover: #57B2DD;
  --color-primary-active: #4EA9D5;
  --color-primary-subtle: #E3F3FB;
  --color-accent: #F3C258;
  --color-accent-hover: #E6B040;
  --color-accent-active: #DBA430;
  --color-accent-subtle: #FDF3D8;
  --color-success: #8CC48C;
  --color-success-hover: #7DB87D;
  --color-success-active: #6FAD6F;
  --color-success-subtle: #E6F3E4;
  --color-danger: #B84E4E;
  --color-danger-hover: #A94444;
  --color-danger-active: #9E3E3E;
  --color-danger-subtle: #FBEFEC;
  --color-neutral: #647A87;
  --color-neutral-hover: #586D7A;
  --color-neutral-active: #4D616D;
  --color-neutral-subtle: #EDF1F3;
  --color-link: #276F94;
  --color-link-active: #1F5B7A;
  --color-overlay: rgb(61 53 48 / 0.35);

  /* radius */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  /* shadow */
  --shadow-sm: 0 1px 2px rgb(94 72 52 / 0.08), 0 2px 6px rgb(94 72 52 / 0.06);
  --shadow-md: 0 4px 14px rgb(94 72 52 / 0.10);
  --shadow-lg: 0 12px 32px rgb(94 72 52 / 0.16);

  /* sketch (pen line) */
  --sketch-line: 2px;
  --sketch-wobble: url(#sketch-wobble);
  --sketch-wobble-soft: url(#sketch-wobble-soft);
  --sketch-radius-sm: 18px 12px 16px 13px / 13px 16px 12px 18px;
  --sketch-radius-md: 22px 14px 20px 16px / 16px 20px 14px 22px;
  --sketch-radius-lg: 26px 16px 24px 18px / 18px 24px 16px 26px;
  --sketch-hatch: repeating-linear-gradient(-45deg, var(--color-ink-soft) 0 1.2px, transparent 1.2px 5px);
  --sketch-paper: url("data:image/svg+xml,..."); /* 갈색 노이즈 9%, 실제 값은 app.css */

  /* space */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; }
}
```

타이포그래피 토큰은 클래스로 둔다.

```css
.text-display  { font: 700 40px/44px var(--font-hand); letter-spacing: -0.1em; }
.text-title    { font: 700 32px/36px var(--font-hand); letter-spacing: -0.1em; }
.text-heading  { font: 700 24px/28px var(--font-hand); letter-spacing: -0.08em; }
.text-body     { font: 400 16px/26px var(--font-base); letter-spacing: -0.01em; }
.text-label    { font: 700 15px/20px var(--font-base); letter-spacing: -0.01em; }
.text-small    { font: 400 14px/22px var(--font-base); letter-spacing: -0.005em; }
.text-caption  { font: 400 12px/18px var(--font-base); letter-spacing: 0; }
.text-hand     { font: 400 20px/30px var(--font-hand); letter-spacing: 0; }
```

버튼 기본형 예시. 요소는 투명하게 두고 `::before`(바탕과 선)와 `::after`(두께)에 그린다.

```css
.btn {
  position: relative; isolation: isolate;
  height: 40px; padding: 0 18px; border: 0; background: transparent;
  font: 700 15px/20px var(--font-base); letter-spacing: -0.01em;
  --fill: var(--color-surface);
}
.btn::before, .btn::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  border-radius: var(--sketch-radius-sm); filter: var(--sketch-wobble);
}
.btn::before { z-index: -1; background: var(--sketch-paper), var(--fill); border: var(--sketch-line) solid var(--color-ink); }
.btn::after  { z-index: -2; translate: 0 3px; background: var(--color-ink); }
.btn-primary { --fill: var(--color-primary); }
.btn-primary:hover { --fill: var(--color-primary-hover); }
.btn:hover  { transform: translateY(-1px); }
.btn:active { transform: translateY(3px); }
.btn:active::after { opacity: 0; }
.btn:focus-visible { outline: 2px dashed var(--color-primary-active); outline-offset: 5px; }
```

## 하지 않는 것

- 다크 모드: MVP에서 만들지 않는다(방 분위기가 라이트 기준).
- 순흑(`#000`), 순백 배경, 회색 그림자.
- 글자에 일렁임 필터 걸기(읽기 어렵고 흐려짐). 필터는 `::before`, `::after` 층에만.
- 카드, 버튼에 번지는 그림자(`shadow-*`). 빗금 그림자와 두께를 쓴다.
- 흰 글자 + 하늘색 배경(대비 부족).
- 손글씨 폰트로 버튼, 경고, 숫자 쓰기.
- 컴포넌트 안에 색, 크기 값을 직접 쓰기. 토큰에 없으면 이 문서에 먼저 추가한다.
