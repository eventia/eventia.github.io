/*
 * 공통 헤더 메뉴·홈 카테고리 카드·아이콘 칩·기간/날짜 표시 처리
 * - 카테고리 목록은 assets/data/site.json 한 곳에서 관리한다
 * - JSON을 못 읽으면 HTML에 미리 써 둔 링크를 그대로 둔다
 * 사용: <body data-category="exam"> + <script src="(루트)/assets/js/site_nav.js" defer></script>
 */
(function () {
  "use strict";

  // 이 스크립트 위치(assets/js/)에서 두 단계 위가 사이트 루트
  const script_el = document.currentScript;
  const root_url = new URL("../../", script_el ? script_el.src : location.href);

  // 카테고리 아이콘 (인라인 SVG, 외부 파일 없음)
  const icon_paths = {
    exam: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    lecture: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    study: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    games: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="17.5" cy="14" r="1"/>',
    about: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  };

  function icon_svg(name) {
    const paths = icon_paths[name];
    if (!paths) return "";
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + "</svg>";
  }

  // <span class="icon_chip" data-icon="exam"> 에 아이콘 채우기
  function fill_icons(scope) {
    (scope || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (!el.firstElementChild) el.innerHTML = icon_svg(el.dataset.icon);
    });
  }

  // 오늘 날짜 (Asia/Seoul, YYYY-MM-DD)
  function today_kst() {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  }

  // data-until="YYYY-MM-DD" 가 지난 강조 항목 숨기기
  function hide_expired(today) {
    document.querySelectorAll("[data-until]").forEach(function (el) {
      if (el.dataset.until && today > el.dataset.until) el.hidden = true;
    });
    // 강조 목록이 모두 숨겨지면 목록 자체도 숨김
    document.querySelectorAll("[data-highlight-list]").forEach(function (list_el) {
      const visible_items = list_el.querySelectorAll("[data-until]:not([hidden])");
      if (visible_items.length === 0) list_el.hidden = true;
    });
  }

  // data-live-dates="YYYY-MM-DD,..." 에 오늘이 있으면 라벨을 앰버 '오늘 진행 중'으로 바꿈
  function mark_live(today) {
    document.querySelectorAll("[data-live-dates]").forEach(function (el) {
      const live_dates = (el.dataset.liveDates || "").split(",").map(function (s) { return s.trim(); });
      if (live_dates.indexOf(today) < 0) return;
      const tag_el = el.querySelector("[data-live-tag]");
      if (!tag_el) return;
      tag_el.textContent = "오늘 진행 중";
      tag_el.classList.add("is_live");
    });
  }

  function make_el(tag, class_name, text) {
    const el = document.createElement(tag);
    if (class_name) el.className = class_name;
    if (text) el.textContent = text;
    return el;
  }

  // 모바일 가로 스크롤 메뉴에서 현재 메뉴가 보이게 함
  function reveal_current(nav_el) {
    const current_el = nav_el.querySelector('a[aria-current="page"]');
    if (!current_el || nav_el.scrollWidth <= nav_el.clientWidth) return;
    nav_el.scrollLeft = Math.max(0, current_el.offsetLeft - nav_el.offsetLeft - 24);
  }

  // 헤더 카테고리 메뉴 그리기
  function render_nav(categories) {
    const current_id = document.body.dataset.category || "";
    document.querySelectorAll("[data-site-nav] .site_nav").forEach(function (nav_el) {
      nav_el.textContent = "";
      categories.forEach(function (cat) {
        const li = make_el("li");
        const a = make_el("a", "", cat.title);
        a.href = new URL(cat.path, root_url).href;
        if (cat.id === current_id) a.setAttribute("aria-current", "page");
        li.appendChild(a);
        nav_el.appendChild(li);
      });
      reveal_current(nav_el);
    });
  }

  // 홈 카테고리 카드 그리기
  function render_cards(categories) {
    document.querySelectorAll("[data-category-cards]").forEach(function (list_el) {
      list_el.textContent = "";
      categories.forEach(function (cat) {
        const is_band = cat.layout === "band";
        const li = make_el("li", is_band ? "is_wide" : "");
        const a = make_el("a", is_band ? "card is_band" : "card");
        a.href = new URL(cat.path, root_url).href;
        if (cat.icon) {
          const chip = make_el("span", "icon_chip is_cat_" + cat.icon);
          chip.dataset.icon = cat.icon;
          a.appendChild(chip);
        }
        const body = make_el("span", "card_body");
        body.appendChild(make_el("span", "card_title", cat.title));
        body.appendChild(make_el("span", "card_desc", cat.desc || ""));
        const arrow = make_el("span", "card_arrow", "→");
        arrow.setAttribute("aria-hidden", "true");
        a.appendChild(body);
        a.appendChild(arrow);
        li.appendChild(a);
        list_el.appendChild(li);
      });
      fill_icons(list_el);
    });
  }

  function load_registry() {
    fetch(new URL("assets/data/site.json", root_url).href, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("site.json " + res.status);
        return res.json();
      })
      .then(function (data) {
        const categories = (data.categories || [])
          .filter(function (cat) { return cat.visible !== false; })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        if (categories.length === 0) return;
        render_nav(categories);
        render_cards(categories);
      })
      .catch(function () {
        // 실패하면 HTML에 써 둔 기본 링크를 그대로 사용
      });
  }

  function init() {
    const today = today_kst();
    fill_icons();
    hide_expired(today);
    mark_live(today);
    document.querySelectorAll("[data-site-nav] .site_nav").forEach(reveal_current);
    load_registry();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
