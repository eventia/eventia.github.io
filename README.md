# eventia.github.io

강의자료·시험·실습 페이지를 모아 둔 개인 GitHub Pages 사이트입니다. (for private use only)

- 배포: `master` 브랜치에 push하면 GitHub Actions(`.github/workflows/static.yml`)가 저장소 전체를 GitHub Pages로 배포합니다.
- 주소: https://eventia.github.io/

## 폴더 구조

```
/
├─ index.html          메인 페이지 (진행 중 배너 + 카테고리 카드)
├─ sas2026.html        신안산대학교 강의자료실 (2026)
├─ site.css            예전 페이지용 호환 스타일 (assets/css 를 불러옴)
├─ assets/             사이트 공통 파일
│  ├─ css/             tokens.css · base.css · components.css
│  ├─ js/site_nav.js   공통 메뉴, 기간 지난 배너 숨김
│  └─ data/site.json   카테고리 목록 (메뉴·홈 카드)
├─ exam/ lecture/ study/ games/ about/   카테고리 허브 (기존 페이지로 연결)
├─ 3dCad/              3D CAD / 3D 프린팅 실기 평가
│  ├─ exam/            통합 실기시험 응시 화면
│  ├─ sau-midexam/     중간평가 실기
│  ├─ sau-retest/      중간평가 실기 재시험
│  └─ images/          도면 이미지
├─ snake-game/         스네이크 게임 (작품)
├─ html/               그 밖의 HTML 페이지 (아래 표 참고)
├─ img/                html/ 의 GA4 실습 페이지가 쓰는 이미지
├─ lect/               강의자료 PDF·실습 파일 (페이지에서 직접 링크)
└─ docs/               기획 문서 (로컬 전용, .gitignore)
```

`_private/`(재시험 문제 원본·Apps Script), `docs/`(모든 깊이의 기획 문서), `ExamSample/`, `ErrorImages/`는 `.gitignore`에 등록되어 있어 저장소에 올라가지 않습니다.

## html/ 페이지 목록

| 파일 | 내용 |
|------|------|
| `powerMidEx.html` | 동적 회로 과제 생성기 (`sas2026.html`에서 링크) |
| `old-sas2026.html` | 신안산대학교 강의자료실 이전 버전 |
| `s1.html` | 3D프린팅제작 및 후처리 강의자료 |
| `tf2025.html` | 한국공학대학교 2025년 강의자료 링크 |
| `tuk2024.html` | 한국공학대학교 2024년 중간고사 링크 |
| `tuk2026.html` | 한국공학대학교 2026년 과제제출 링크 |
| `m1.html` ~ `m3.html` | 2025 고교동아리 SW경진대회 멘토링 |
| `z_mento_g1.html` ~ `z_mento_g3.html` | 2023 고교동아리 멘토링 |
| `index0.html`, `ga4_d1~d3.html` | GA4 실습 (다이어리 쇼핑몰 회원가입 흐름) |
| `gtm.html`, `ga4_d11~d13.html` | GTM 실습 (다이어리 쇼핑몰) |
| `ga4_3.html` | GA4 실습 (다이어리 쇼핑몰 단일 페이지) |
| `indexasu.html` | 메인 페이지 이전 버전 |
| `style.css` | GA4·GTM 실습 페이지 공통 스타일 |
