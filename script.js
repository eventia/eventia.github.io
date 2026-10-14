/* =========================================================
   데이터 — 여기만 고치면 페이지 내용이 바뀝니다.
   ========================================================= */
const quotes = [
  { text: '책은 우리 안의 얼어붙은 바다를 깨는 도끼여야 한다.', src: '프란츠 카프카' },
  { text: '영화는 1초에 24번의 진실이다.', src: '장뤼크 고다르' },
  { text: '가르치는 것은 두 번 배우는 것이다.', src: '조제프 주베르' },
  { text: '독서는 완성된 사람을, 토론은 준비된 사람을, 쓰기는 정확한 사람을 만든다.', src: '프랜시스 베이컨' },
  { text: '나는 내가 아무것도 모른다는 것을 안다.', src: '소크라테스' },
];

const courses = [
  {
    tag: '교양', name: '책으로 읽는 세계', term: '2026 가을학기 · 화/목 10:30',
    desc: '고전과 현대 소설을 함께 읽으며 텍스트를 깊이 읽는 법을 익힙니다.',
    detail: '매주 한 편의 작품을 읽고 짧은 에세이를 씁니다. 기말은 자유 주제 비평문입니다.',
  },
  {
    tag: '전공', name: '영화와 서사', term: '2026 가을학기 · 수 14:00',
    desc: '영화의 이야기 구조와 시각 언어를 분석합니다.',
    detail: '매 수업 한 편의 영화를 함께 보고 장면 단위로 토론합니다. 조별 영상 비평 발표가 있습니다.',
  },
  {
    tag: '세미나', name: '글쓰기와 비평', term: '2026 봄학기',
    desc: '책과 영화에 대해 설득력 있게 쓰는 법을 연습하는 소규모 세미나입니다.',
    detail: '초고 → 동료 피드백 → 퇴고의 과정을 반복합니다. 정원 15명.',
  },
];

const books = [
  { title: '데미안', author: '헤르만 헤세', genre: '소설', color: '#6b3a2e', note: '해마다 다른 문장이 밑줄을 부르는 책. 스무 살에도, 마흔에도.' },
  { title: '채식주의자', author: '한강', genre: '소설', color: '#2f4a3a', note: '조용한 문장이 이렇게까지 격렬할 수 있다는 것.' },
  { title: '사피엔스', author: '유발 하라리', genre: '인문', color: '#8a6a2a', note: '수업 첫 주에 학생들에게 던지는 질문의 출처.' },
  { title: '코스모스', author: '칼 세이건', genre: '과학', color: '#1f2f52', note: '밤하늘을 올려다볼 이유를 하나 더 만들어 준 책.' },
  { title: '이방인', author: '알베르 카뮈', genre: '소설', color: '#9a4b2c', note: '첫 문장 하나로 한 학기 토론이 가능하다.' },
  { title: '정의란 무엇인가', author: '마이클 샌델', genre: '인문', color: '#4a3b5c', note: '강의란 이렇게 하는 것이구나, 싶었던 책.' },
  { title: '침묵의 봄', author: '레이첼 카슨', genre: '과학', color: '#3c5a4a', note: '한 권의 책이 세상을 바꾼다는 말의 증거.' },
  { title: '시와 산책', author: '한정원', genre: '에세이', color: '#7a6a58', note: '천천히 읽어야 하는 책. 산책처럼.' },
];

const movies = [
  { title: '기생충', director: '봉준호', year: 2019, genre: '한국', rating: 5, note: '계단 하나로 계급을 설명하는 영화. 매 학기 수업 자료.' },
  { title: '헤어질 결심', director: '박찬욱', year: 2022, genre: '한국', rating: 5, note: '대사가 아니라 시선으로 쓰인 연애편지.' },
  { title: '패터슨', director: '짐 자무쉬', year: 2016, genre: '해외', rating: 5, note: '반복되는 하루 속에서 시를 발견하는 법.' },
  { title: '시네마 천국', director: '주세페 토르나토레', year: 1988, genre: '고전', rating: 4, note: '영화를 왜 사랑하는지 잊을 때마다 다시 본다.' },
  { title: '화양연화', director: '왕가위', year: 2000, genre: '해외', rating: 5, note: '복도, 계단, 국수통. 공간이 감정이 되는 순간들.' },
  { title: '12인의 성난 사람들', director: '시드니 루멧', year: 1957, genre: '고전', rating: 4, note: '토론 수업의 교과서. 한 방, 열두 명, 한 시간 반.' },
];

/* =========================================================
   유틸
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* =========================================================
   테마 (라이트/다크)
   ========================================================= */
const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function currentMode() {
  const forced = root.getAttribute('data-theme');
  return forced || (darkQuery.matches ? 'dark' : 'light');
}
function syncMode() { root.setAttribute('data-mode', currentMode()); }

$('.theme-toggle').addEventListener('click', () => {
  const next = currentMode() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncMode();
});
darkQuery.addEventListener('change', syncMode);
syncMode();

/* =========================================================
   모바일 메뉴
   ========================================================= */
const navToggle = $('.nav-toggle');
const navLinks = $('.nav-links');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
$$('.nav-links a').forEach((a) => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

/* =========================================================
   명언
   ========================================================= */
let quoteIdx = Math.floor(Math.random() * quotes.length);
const quoteEl = $('#quote');
function showQuote() {
  $('.quote-text', quoteEl).textContent = `“${quotes[quoteIdx].text}”`;
  $('.quote-src', quoteEl).textContent = quotes[quoteIdx].src;
}
$('#next-quote').addEventListener('click', () => {
  quoteEl.classList.add('fade');
  setTimeout(() => {
    quoteIdx = (quoteIdx + 1) % quotes.length;
    showQuote();
    quoteEl.classList.remove('fade');
  }, 300);
});
showQuote();

/* =========================================================
   강의 (아코디언)
   ========================================================= */
$('#course-list').innerHTML = courses.map((c) => `
  <article class="course">
    <button class="course-head" aria-expanded="false">
      <span class="course-tag">${esc(c.tag)}</span>
      <span class="course-name">${esc(c.name)}</span>
      <span class="course-term">${esc(c.term)}</span>
      <span class="course-arrow" aria-hidden="true">▾</span>
    </button>
    <div class="course-body">
      <div class="course-body-inner">
        <p>${esc(c.desc)}</p>
        <p>${esc(c.detail)}</p>
      </div>
    </div>
  </article>`).join('');

$$('.course-head').forEach((btn) => btn.addEventListener('click', () => {
  const course = btn.parentElement;
  const body = $('.course-body', course);
  const open = course.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
}));

/* =========================================================
   서재 & 영화 (필터)
   ========================================================= */
$('#shelf').innerHTML = books.map((b, i) => `
  <button class="book" data-genre="${esc(b.genre)}" data-index="${i}">
    <div class="book-cover" style="background:${esc(b.color)}">
      <h4>${esc(b.title)}</h4>
      <small>${esc(b.author)}</small>
    </div>
    <div class="book-meta">${esc(b.genre)}</div>
  </button>`).join('');

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
$('#movie-grid').innerHTML = movies.map((m) => `
  <article class="movie" data-genre="${esc(m.genre)}">
    <div class="movie-top">
      <span class="movie-year">${m.year} · ${esc(m.genre)}</span>
      <span class="stars" aria-label="별점 ${m.rating}점">${stars(m.rating)}</span>
    </div>
    <h4>${esc(m.title)}</h4>
    <p class="movie-director">감독 ${esc(m.director)}</p>
    <p class="movie-note">${esc(m.note)}</p>
  </article>`).join('');

function setupFilter(container, items, itemSelector) {
  const genres = ['전체', ...new Set(items.map((x) => x.genre))];
  container.innerHTML = genres.map((g, i) =>
    `<button class="filter-btn${i === 0 ? ' active' : ''}" data-genre="${esc(g)}">${esc(g)}</button>`).join('');
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    $$('.filter-btn', container).forEach((b) => b.classList.toggle('active', b === btn));
    const g = btn.dataset.genre;
    $$(itemSelector).forEach((el) => el.classList.toggle('hidden', g !== '전체' && el.dataset.genre !== g));
  });
}
setupFilter($('.filters[data-target="books"]'), books, '.book');
setupFilter($('.filters[data-target="movies"]'), movies, '.movie');

/* =========================================================
   책 감상 모달
   ========================================================= */
const modal = $('#modal');
let lastFocus = null;
function openModal(book) {
  lastFocus = document.activeElement;
  $('#modal-meta').textContent = `${book.author} · ${book.genre}`;
  $('#modal-title').textContent = book.title;
  $('#modal-body').textContent = book.note;
  modal.hidden = false;
  $('.modal-close', modal).focus();
}
function closeModal() {
  modal.hidden = true;
  if (lastFocus) lastFocus.focus();
}
$('#shelf').addEventListener('click', (e) => {
  const el = e.target.closest('.book');
  if (el) openModal(books[el.dataset.index]);
});
modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

/* =========================================================
   스크롤 효과: 등장 애니메이션, 숫자 카운트, 현재 메뉴 표시
   ========================================================= */
function countUp(el) {
  const target = +el.dataset.count;
  const start = performance.now();
  const dur = 1200;
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

if ('IntersectionObserver' in window) {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      $$('[data-count]', entry.target).forEach(countUp);
      revealObs.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => revealObs.observe(el));

  const navObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      $$('.nav-links a').forEach((a) =>
        a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => navObs.observe(s));
} else {
  $$('.reveal').forEach((el) => el.classList.add('visible'));
  $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
}

/* =========================================================
   연도
   ========================================================= */
$('#year').textContent = new Date().getFullYear();
