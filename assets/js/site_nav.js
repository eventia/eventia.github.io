/*
 * 공통 헤더 메뉴·홈 카테고리 카드·기간 지난 강조 항목 처리
 * - 카테고리 목록은 assets/data/site.json 한 곳에서 관리한다
 * - JSON을 못 읽으면 HTML에 미리 써 둔 링크를 그대로 둔다
 * 사용: <body data-category="exam"> + <script src="(루트)/assets/js/site_nav.js" defer></script>
 */
(function () {
  "use strict";

  // 이 스크립트 위치(assets/js/)에서 두 단계 위가 사이트 루트
  const script_el = document.currentScript;
  const root_url = new URL("../../", script_el ? script_el.src : location.href);

  // 오늘 날짜 (Asia/Seoul, YYYY-MM-DD)
  function today_kst() {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  }

  // data-until="YYYY-MM-DD" 가 지난 강조 항목 숨기기
  function hide_expired() {
    const today = today_kst();
    document.querySelectorAll("[data-until]").forEach(function (el) {
      if (el.dataset.until && today > el.dataset.until) {
        el.hidden = true;
      }
    });
    // 강조 목록이 모두 숨겨지면 목록 자체도 숨김
    document.querySelectorAll("[data-highlight-list]").forEach(function (list_el) {
      const visible_items = list_el.querySelectorAll("[data-until]:not([hidden])");
      if (visible_items.length === 0) list_el.hidden = true;
    });
  }

  function make_el(tag, class_name, text) {
    const el = document.createElement(tag);
    if (class_name) el.className = class_name;
    if (text) el.textContent = text;
    return el;
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
    });
  }

  // 홈 카테고리 카드 그리기
  function render_cards(categories) {
    document.querySelectorAll("[data-category-cards]").forEach(function (list_el) {
      list_el.textContent = "";
      categories.forEach(function (cat) {
        const li = make_el("li");
        const a = make_el("a", "card");
        a.href = new URL(cat.path, root_url).href;
        const body = make_el("span");
        body.appendChild(make_el("span", "card_title", cat.title));
        body.appendChild(make_el("span", "card_desc", cat.desc || ""));
        const arrow = make_el("span", "card_arrow", "→");
        arrow.setAttribute("aria-hidden", "true");
        a.appendChild(body);
        a.appendChild(arrow);
        li.appendChild(a);
        list_el.appendChild(li);
      });
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
    hide_expired();
    load_registry();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
