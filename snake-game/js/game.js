// 스네이크 게임: 의존성 없는 IIFE 하나
(function () {
  'use strict';

  // ===== 설정 =====
  var grid_size = 20;          // 한 변의 칸 수
  var tick_ms = 120;           // 한 칸 이동 간격
  var food_score = 10;         // 먹이 하나당 점수
  var max_queue = 2;           // 미리 받아 둘 방향 입력 수
  var swipe_threshold = 30;    // 스와이프로 인정할 최소 거리(px)
  var storage_key = 'snake_best_score';

  var directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  var key_map = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  // ===== 요소 =====
  var board_wrap = document.getElementById('board_wrap');
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var score_el = document.getElementById('score');
  var best_el = document.getElementById('best_score');
  var overlay = document.getElementById('overlay');
  var overlay_title = document.getElementById('overlay_title');
  var overlay_text = document.getElementById('overlay_text');
  var start_button = document.getElementById('start_button');

  // ===== 상태 =====
  var snake = [];              // [0]이 머리
  var direction = directions.right;
  var dir_queue = [];
  var food = null;
  var score = 0;
  var best_score = 0;
  var game_state = 'ready';    // ready | playing | paused | over
  var cell_px = 0;
  var colors = {};
  var last_time = 0;
  var acc_time = 0;
  var frame_id = 0;

  // ===== 저장소 =====
  function load_best() {
    try {
      var value = parseInt(localStorage.getItem(storage_key), 10);
      return isNaN(value) ? 0 : value;
    } catch (e) {
      return 0;
    }
  }

  function save_best(value) {
    try {
      localStorage.setItem(storage_key, String(value));
    } catch (e) {
      // 저장할 수 없는 환경(사생활 보호 모드 등)에서는 이번 세션에만 유지
    }
  }

  // ===== 로직 =====
  function reset_game() {
    var mid = Math.floor(grid_size / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    direction = directions.right;
    dir_queue = [];
    score = 0;
    acc_time = 0;
    place_food();
    update_score();
  }

  function is_on_cells(cells, x, y) {
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].x === x && cells[i].y === y) return true;
    }
    return false;
  }

  // 뱀이 없는 빈 칸 중 하나에 먹이를 놓는다
  function place_food() {
    var empty_cells = [];
    for (var y = 0; y < grid_size; y++) {
      for (var x = 0; x < grid_size; x++) {
        if (!is_on_cells(snake, x, y)) empty_cells.push({ x: x, y: y });
      }
    }
    food = empty_cells.length ? empty_cells[Math.floor(Math.random() * empty_cells.length)] : null;
  }

  // 방향 입력은 모두 여기로 모인다. 직전 방향과 같거나 정반대면 버린다
  function enqueue_direction(name) {
    var next_dir = directions[name];
    if (!next_dir || game_state !== 'playing') return;
    var base_dir = dir_queue.length ? dir_queue[dir_queue.length - 1] : direction;
    if (next_dir === base_dir) return;
    if (next_dir.x === -base_dir.x && next_dir.y === -base_dir.y) return;
    if (dir_queue.length < max_queue) dir_queue.push(next_dir);
  }

  // 한 틱: 방향 적용 → 충돌 검사 → 이동·성장
  function step() {
    if (dir_queue.length) direction = dir_queue.shift();

    var head = snake[0];
    var next_head = { x: head.x + direction.x, y: head.y + direction.y };

    if (next_head.x < 0 || next_head.y < 0 || next_head.x >= grid_size || next_head.y >= grid_size) {
      end_game(false);
      return;
    }

    var will_eat = food !== null && next_head.x === food.x && next_head.y === food.y;
    // 먹지 않으면 꼬리가 이번 틱에 빠지므로 꼬리 칸으로는 들어갈 수 있다
    var body = will_eat ? snake : snake.slice(0, -1);
    if (is_on_cells(body, next_head.x, next_head.y)) {
      end_game(false);
      return;
    }

    snake.unshift(next_head);
    if (will_eat) {
      score += food_score;
      update_score();
      place_food();
      if (food === null) end_game(true); // 보드를 꽉 채움
    } else {
      snake.pop();
    }
  }

  // ===== 그리기 =====
  function read_colors() {
    var style = getComputedStyle(document.documentElement);
    ['board', 'board-alt', 'snake', 'snake-head', 'food'].forEach(function (name) {
      colors[name] = style.getPropertyValue('--' + name).trim();
    });
  }

  function resize_canvas() {
    var size = board_wrap.clientWidth;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell_px = size / grid_size;
    draw_board();
  }

  function fill_round_rect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
  }

  function draw_board() {
    var size = cell_px * grid_size;
    var pad = Math.max(1, cell_px * 0.08);

    // 체커 무늬 바탕
    ctx.fillStyle = colors.board;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = colors['board-alt'];
    for (var y = 0; y < grid_size; y++) {
      for (var x = (y % 2); x < grid_size; x += 2) {
        ctx.fillRect(x * cell_px, y * cell_px, cell_px, cell_px);
      }
    }

    // 먹이
    if (food) {
      ctx.fillStyle = colors.food;
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * cell_px, (food.y + 0.5) * cell_px, cell_px * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }

    // 뱀: 꼬리부터 그려서 머리가 위에 오게
    for (var i = snake.length - 1; i >= 0; i--) {
      ctx.fillStyle = i === 0 ? colors['snake-head'] : colors.snake;
      fill_round_rect(snake[i].x * cell_px + pad, snake[i].y * cell_px + pad,
        cell_px - pad * 2, cell_px - pad * 2, cell_px * 0.25);
    }
  }

  // ===== 화면 =====
  function update_score() {
    score_el.textContent = score;
    best_el.textContent = best_score;
  }

  function show_overlay(title, text, button_label) {
    overlay_title.textContent = title;
    overlay_text.textContent = text;
    start_button.textContent = button_label;
    overlay.hidden = false;
  }

  function hide_overlay() {
    overlay.hidden = true;
    // 숨겨진 버튼에 포커스가 남지 않게
    if (document.activeElement === start_button) start_button.blur();
  }

  // ===== 상태 전환 =====
  function start_game() {
    if (game_state === 'playing') return;
    if (game_state !== 'paused') reset_game();
    game_state = 'playing';
    hide_overlay();
    run_loop();
  }

  function pause_game() {
    if (game_state !== 'playing') return;
    game_state = 'paused';
    stop_loop();
    show_overlay('일시정지', '돌아오면 이어서 할 수 있어요', '계속하기');
  }

  function end_game(is_clear) {
    game_state = 'over';
    stop_loop();
    var is_new_best = score > best_score;
    if (is_new_best) {
      best_score = score;
      save_best(best_score);
      update_score();
    }
    var text = '점수 ' + score + '점' + (is_new_best && score > 0 ? '\n최고 기록 달성!' : '\n최고 ' + best_score + '점');
    show_overlay(is_clear ? '클리어!' : '게임 오버', text, '다시 시작');
    draw_board();
  }

  // ===== 입력 =====
  document.addEventListener('keydown', function (e) {
    var dir_name = key_map[e.key];
    if (dir_name) {
      e.preventDefault(); // 방향키로 페이지가 스크롤되지 않게
      enqueue_direction(dir_name);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      // 포커스된 버튼의 기본 클릭과 겹치지 않게 막고 여기서 처리
      e.preventDefault();
      if (e.repeat) return;
      if (game_state === 'playing') {
        pause_game();
      } else {
        start_game();
      }
    }
  });

  start_button.addEventListener('click', start_game);

  // 스와이프: 손을 뗄 때 이동 거리가 큰 축으로 판정
  var touch_start = null;
  board_wrap.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touch_start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  board_wrap.addEventListener('touchmove', function (e) {
    if (game_state === 'playing') e.preventDefault();
  }, { passive: false });

  board_wrap.addEventListener('touchend', function (e) {
    if (!touch_start) return;
    var touch = e.changedTouches[0];
    var dx = touch.clientX - touch_start.x;
    var dy = touch.clientY - touch_start.y;
    touch_start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < swipe_threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      enqueue_direction(dx > 0 ? 'right' : 'left');
    } else {
      enqueue_direction(dy > 0 ? 'down' : 'up');
    }
  });

  // 십자 버튼: click보다 빠른 pointerdown 사용
  Array.prototype.forEach.call(document.querySelectorAll('.dpad-btn'), function (btn) {
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      enqueue_direction(btn.getAttribute('data-dir'));
    });
  });

  // 탭이 숨겨지면 일시정지
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause_game();
  });

  // ===== 루프 =====
  function game_loop(now) {
    // 탭 전환 등으로 시간이 크게 튀어도 한 번에 너무 많이 움직이지 않게
    var delta = Math.min(now - last_time, 250);
    last_time = now;
    acc_time += delta;
    while (acc_time >= tick_ms && game_state === 'playing') {
      step();
      acc_time -= tick_ms;
    }
    if (game_state !== 'playing') return;
    draw_board();
    frame_id = requestAnimationFrame(game_loop);
  }

  function run_loop() {
    stop_loop();
    last_time = performance.now();
    frame_id = requestAnimationFrame(game_loop);
  }

  function stop_loop() {
    if (frame_id) cancelAnimationFrame(frame_id);
    frame_id = 0;
  }

  // ===== 초기화 =====
  best_score = load_best();
  read_colors();
  reset_game();
  resize_canvas();

  if (window.ResizeObserver) {
    new ResizeObserver(resize_canvas).observe(board_wrap);
  } else {
    window.addEventListener('resize', resize_canvas);
  }
})();
