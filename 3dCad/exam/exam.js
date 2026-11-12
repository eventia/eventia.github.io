// ===== 3D CAD 실기시험 화면 — 시간·진행·명단 판단은 서버(Apps Script)가 하고, 여기서는 표시만 담당 =====

const max_file_bytes = 10 * 1024 * 1024;
const storage_key = 'cad_exam_student';

// 입력값 검증 — 오류 메시지 반환 (없으면 빈 문자열)
function validate_input(class_name, student_id, student_name) {
  let class_error = '';
  let id_error = '';
  let name_error = '';
  if (class_name === '') class_error = '반을 고르세요.';
  if (student_id === '') id_error = '학번을 입력하세요.';
  else if (!/^\d+$/.test(student_id)) id_error = '학번은 숫자만 입력하세요.';
  else if (student_id.length < 3) id_error = '학번은 3자리 이상이어야 합니다.';
  if (student_name === '') name_error = '이름을 고르세요.';
  return { class_error, id_error, name_error };
}

// 남은 시간 표기 (h:mm:ss 또는 mm:ss, 하루 이상이면 "n일 h:mm:ss")
function format_remain(ms) {
  const total_sec = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total_sec / 86400);
  const h = Math.floor((total_sec % 86400) / 3600);
  const m = Math.floor((total_sec % 3600) / 60);
  const s = total_sec % 60;
  const two = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}일 ${h}:${two(m)}:${two(s)}`;
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

// 시각 표기 (한국 시간 HH:MM)
function format_clock(ms, with_seconds) {
  return new Date(ms).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: with_seconds ? '2-digit' : undefined,
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
}

function format_day(ms) {
  return new Date(ms).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' });
}

function level_class(level) {
  return level === '쉬움' ? 'easy' : level === '중간' ? 'medium' : 'hard';
}

// localStorage 접근 (막혀 있어도 동작하도록)
function storage_get(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storage_set(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* 무시 */ }
}

if (typeof module !== 'undefined') {
  module.exports = { validate_input, format_remain, level_class };
}

if (typeof document !== 'undefined') {
  const el = (id) => document.getElementById(id);
  const sections = ['input_section', 'message_section', 'exam_section', 'done_section'];

  // 화면 상태
  const state = {
    student: null, // { student_id, name, class_name, token }
    offset_ms: 0, // 서버 시각 - 내 컴퓨터 시각
    session: null, // { session_id, exam_id, exam_name, notice, start, end, deadline, total }
    submitted: [],
    current: null, // 현재 문제 { number, level, problem_id, points, dimensions, svg, submitted }
    busy: false,
    waiting_for_start: false,
  };
  const saved = JSON.parse(storage_get(storage_key) || 'null') || {};

  const server_now = () => Date.now() + state.offset_ms;
  const token_key = () => `cad_exam_token_${state.session.exam_id}_${state.student.student_id}`;

  function show_section(name) {
    sections.forEach((id) => (el(id).hidden = id !== name));
    window.scrollTo(0, 0);
  }

  // 안내 메시지 화면
  function show_message(title, text, big, with_button) {
    el('message_title').textContent = title;
    el('message_text').textContent = text || '';
    el('message_big').textContent = big || '';
    el('message_big').hidden = !big;
    el('message_button').hidden = !with_button;
    show_section('message_section');
  }

  function set_exam_name(session) {
    const top = el('exam_name_top');
    top.textContent = session ? session.exam_name : '';
    top.hidden = !session;
    if (session) document.title = session.exam_name;
  }

  // ---------- 서버 통신 ----------
  // Content-Type 을 지정하지 않아(text/plain) CORS 사전 요청 없이 전송
  async function api(action, extra, with_student) {
    const body = Object.assign({ action: action }, with_student === false ? {} : state.student, extra || {});
    const sent_at = Date.now();
    let res;
    try {
      const response = await fetch(api_url, { method: 'POST', body: JSON.stringify(body) });
      res = await response.json();
    } catch (error) {
      console.error(error);
      return { ok: false, code: 'network', message: '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요.' };
    }
    if (res.server_time && action !== 'submit') {
      // 왕복 시간의 중간을 서버 시각으로 보고 시계 차이 보정
      state.offset_ms = res.server_time - (sent_at + Date.now()) / 2;
    }
    return res;
  }

  // ---------- 반·이름 목록 ----------
  function fill_select(select, items, placeholder, selected) {
    select.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    items.forEach(function (item) {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
    if (selected && items.indexOf(selected) >= 0) select.value = selected;
  }

  async function load_classes() {
    const status = el('form_status');
    status.className = 'form_status';
    status.textContent = '시험 정보를 불러오는 중...';
    const res = await api('classes', {}, false);
    if (!res.ok) {
      status.textContent = res.message;
      status.className = 'form_status bad';
      return;
    }
    if (res.classes.length === 0) {
      status.textContent = '지금 응시할 수 있는 시험이 없습니다. 시험 시작 3시간 전부터 입장할 수 있습니다.';
      status.className = 'form_status bad';
      fill_select(el('class_select'), [], '응시할 반 없음');
      return;
    }
    status.textContent = '';
    fill_select(el('class_select'), res.classes, '반을 고르세요', saved.class_name);
    if (el('class_select').value) load_names(saved.name);
  }

  async function load_names(selected_name) {
    const class_name = el('class_select').value;
    const select = el('name_select');
    select.disabled = true;
    if (!class_name) {
      fill_select(select, [], '반을 먼저 고르세요');
      return;
    }
    fill_select(select, [], '불러오는 중...');
    const res = await api('names', { class_name: class_name }, false);
    if (el('class_select').value !== class_name) return; // 그 사이 반을 바꾼 경우
    if (!res.ok) {
      fill_select(select, [], '불러오지 못함');
      el('name_error').textContent = res.message;
      return;
    }
    el('name_error').textContent = '';
    fill_select(select, res.names, '이름을 고르세요', selected_name);
    select.disabled = false;
  }

  el('class_select').addEventListener('change', () => load_names(''));

  // ---------- 입장 ----------
  async function enter() {
    show_message('서버 확인 중...', '잠시만 기다리세요.');
    const res = await api('status');
    if (!res.ok) {
      show_message('입장할 수 없습니다', res.message, '', true);
      return;
    }
    state.session = res.session;
    set_exam_name(res.session);
    if (res.session) state.student.token = storage_get(token_key()) || '';
    if (res.phase === 'waiting') {
      state.waiting_for_start = true;
      show_message(
        `${res.session.exam_name} 시작까지`,
        `${format_day(res.session.start)} 시작 ${format_clock(res.session.start)} · 종료 ${format_clock(res.session.end)}\n` +
          '시작 시각이 되면 첫 문제가 자동으로 나타납니다. 이 창을 닫지 마세요.',
        format_remain(res.session.start - server_now())
      );
    } else if (res.phase === 'open' || res.phase === 'grace') {
      load_problem();
    } else if (res.phase === 'other_session') {
      show_message('응시할 수 없습니다', res.message, '', true);
    } else if (res.phase === 'no_session') {
      show_message('예정된 시험이 없습니다', '이 반에 예정된 시험이 없습니다. 감독관에게 문의하세요.', '', true);
    } else {
      show_message('시험이 종료되었습니다', '제출 시간이 지났습니다.', '', true);
    }
  }

  // ---------- 문제 불러오기 ----------
  async function load_problem() {
    state.waiting_for_start = false;
    const res = await api('problem');
    if (!res.ok) {
      if (res.code === 'not_started') {
        setTimeout(enter, 2000); // 시계 차이로 조금 일찍 요청한 경우 다시 대기
        return;
      }
      show_message('문제를 열 수 없습니다', res.message, '', true);
      return;
    }
    state.session = res.session;
    if (res.token) {
      state.student.token = res.token;
      storage_set(token_key(), res.token);
    }
    state.submitted = res.submitted;
    if (res.done) {
      show_done();
      return;
    }
    state.current = res.problem;
    render_problem();
  }

  function render_problem() {
    const p = state.current;
    const total = state.session.total;
    el('info_name').textContent = state.student.name;
    el('info_class').textContent = state.student.class_name;
    el('info_id').textContent = state.student.student_id;
    el('end_text').textContent = `종료 ${format_clock(state.session.end)} (제출 마감 ${format_clock(state.session.deadline)})`;
    el('notice').textContent = state.session.notice || '';
    el('notice').hidden = !state.session.notice;
    el('problem_number').textContent = p.number;
    el('problem_total').textContent = total;
    el('problem_level').textContent = p.level;
    el('problem_level').className = 'level ' + level_class(p.level);
    el('problem_points').textContent = p.points !== '' && p.points !== undefined ? `${p.points}점` : '';
    el('drawing').innerHTML = p.svg; // 서버(내 Apps Script)가 만든 SVG

    // 진행 단계 동그라미
    const steps = el('steps');
    steps.innerHTML = '';
    for (let n = 1; n <= total; n++) {
      const li = document.createElement('li');
      li.textContent = n;
      if (n < p.number) li.className = 'passed' + (state.submitted.includes(n) ? ' sent' : '');
      if (n === p.number) li.className = 'current';
      li.title = n < p.number ? (state.submitted.includes(n) ? '제출함' : '미제출') : '';
      steps.appendChild(li);
    }

    el('file_input').value = '';
    el('file_info').textContent = 'PDF 파일(10MB 이하)을 선택하세요.';
    el('file_info').className = 'file_info';
    el('submit_button').disabled = true;
    set_submitted_view(p.submitted, '');
    el('next_button').textContent = p.number >= total ? '시험 마치기' : '다음 문제 →';
    el('next_button').disabled = false;
    show_section('exam_section');
    tick();
  }

  // 제출 완료 여부에 따라 제출 영역 표시
  function set_submitted_view(is_submitted, time_text) {
    el('submit_form').hidden = is_submitted;
    const result = el('submit_result');
    if (is_submitted) {
      result.textContent = '✔ 이 문제의 답안을 제출했습니다' + (time_text ? ` (${time_text})` : '') + '. 다시 제출할 수 없습니다.';
      result.className = 'submit_result ok';
    } else {
      result.textContent = '';
      result.className = 'submit_result';
    }
  }

  // ---------- 완료 화면 ----------
  function show_done() {
    const list = el('summary');
    list.innerHTML = '';
    for (let n = 1; n <= state.session.total; n++) {
      const li = document.createElement('li');
      const sent = state.submitted.includes(n);
      li.innerHTML = `문제 ${n}: <span class="${sent ? 'sent' : 'none'}">${sent ? '제출함' : '미제출'}</span>`;
      list.appendChild(li);
    }
    show_section('done_section');
  }

  // ---------- 1초마다 시간 표시 ----------
  function tick() {
    const now = server_now();
    if (state.waiting_for_start && state.session) {
      const remain = state.session.start - now;
      el('message_big').textContent = format_remain(remain);
      if (remain <= 0) {
        state.waiting_for_start = false;
        // 학생들이 한꺼번에 요청하지 않도록 0~3초 분산
        setTimeout(load_problem, Math.random() * 3000);
      }
      return;
    }
    if (el('exam_section').hidden || !state.session) return;

    const remain_text = el('remain_text');
    const banner = el('grace_banner');
    if (now < state.session.end) {
      remain_text.textContent = '남은 시간 ' + format_remain(state.session.end - now);
      remain_text.classList.toggle('urgent', state.session.end - now < 5 * 60000);
      banner.hidden = true;
    } else if (now < state.session.deadline) {
      remain_text.textContent = '제출 마감까지 ' + format_remain(state.session.deadline - now);
      remain_text.classList.add('urgent');
      banner.textContent = '시험 시간이 끝났습니다. 제출 마감까지 ' + format_remain(state.session.deadline - now) + ' 남았습니다. 지금 바로 제출하세요!';
      banner.hidden = false;
    } else {
      remain_text.textContent = '제출 마감';
      banner.textContent = '제출이 마감되었습니다. 더 이상 답안을 제출할 수 없습니다.';
      banner.hidden = false;
      el('submit_button').disabled = true;
      el('file_input').disabled = true;
      el('next_button').disabled = true;
    }
  }
  setInterval(tick, 500);

  // ---------- 입장 폼 ----------
  if (saved.student_id) el('student_id').value = saved.student_id;
  load_classes();

  el('exam_form').addEventListener('submit', (event) => {
    event.preventDefault();
    const class_name = el('class_select').value;
    const student_id = el('student_id').value.trim();
    const name = el('name_select').value;
    const errors = validate_input(class_name, student_id, name);
    el('class_error').textContent = errors.class_error;
    el('id_error').textContent = errors.id_error;
    el('name_error').textContent = errors.name_error;
    el('class_select').classList.toggle('invalid', errors.class_error !== '');
    el('student_id').classList.toggle('invalid', errors.id_error !== '');
    el('name_select').classList.toggle('invalid', errors.name_error !== '');
    if (errors.class_error || errors.id_error || errors.name_error) return;

    saved.class_name = class_name;
    saved.student_id = student_id;
    saved.name = name;
    storage_set(storage_key, JSON.stringify(saved));
    state.student = { student_id: student_id, name: name, class_name: class_name, token: '' };
    enter();
  });

  el('message_button').addEventListener('click', () => {
    state.waiting_for_start = false;
    show_section('input_section');
    load_classes();
  });

  // ---------- 파일 선택·제출 ----------
  el('file_input').addEventListener('change', () => {
    const file = el('file_input').files[0];
    const info = el('file_info');
    el('submit_button').disabled = true;
    if (!file) {
      info.textContent = 'PDF 파일(10MB 이하)을 선택하세요.';
      info.className = 'file_info';
      return;
    }
    const size_text = (file.size / 1024 / 1024).toFixed(2) + 'MB';
    if (!/\.pdf$/i.test(file.name)) {
      info.textContent = `PDF 파일만 제출할 수 있습니다. (${file.name})`;
      info.className = 'file_info bad';
    } else if (file.size > max_file_bytes) {
      info.textContent = `파일이 너무 큽니다: ${size_text} (10MB 이하)`;
      info.className = 'file_info bad';
    } else {
      info.textContent = `선택한 파일: ${file.name} (${size_text})`;
      info.className = 'file_info';
      el('submit_button').disabled = false;
    }
  });

  function read_base64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 받은 문제를 채점용 PNG 로 변환 (위쪽에 시험·학생·문제 정보, 아래에 도면)
  async function make_problem_png() {
    const p = state.current;
    const out_w = 1600;
    const view_box = (p.svg.match(/viewBox="([\d.\s-]+)"/) || [])[1];
    if (!view_box) throw new Error('viewBox 없음');
    const vb = view_box.trim().split(/\s+/).map(Number);
    const draw_h = Math.round((out_w * vb[3]) / vb[2]);
    const svg_text = p.svg.replace('<svg ', `<svg width="${out_w}" height="${draw_h}" `);
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg_text);
    });
    const head_h = 120;
    const canvas = document.createElement('canvas');
    canvas.width = out_w;
    canvas.height = head_h + draw_h;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#1a4fa0';
    g.font = 'bold 34px "Malgun Gothic", sans-serif';
    g.fillText(`${state.session.exam_name} · 문제 ${p.number}/${state.session.total} (${p.problem_id}, ${p.level})`, 30, 50);
    g.fillStyle = '#111';
    g.font = '28px "Malgun Gothic", sans-serif';
    const d = p.dimensions;
    g.fillText(
      `${state.student.class_name} · ${state.student.student_id} · ${state.student.name} · A=${d.A}  B=${d.B}  C=${d.C} · 회차 ${state.session.session_id}`,
      30,
      96
    );
    g.strokeStyle = '#ccc';
    g.beginPath();
    g.moveTo(0, head_h - 4);
    g.lineTo(out_w, head_h - 4);
    g.stroke();
    g.drawImage(image, 0, head_h, out_w, draw_h);
    return canvas.toDataURL('image/png').split(',')[1];
  }

  el('submit_button').addEventListener('click', async () => {
    const file = el('file_input').files[0];
    if (!file || state.busy) return;
    const number = state.current.number;
    if (!confirm(`문제 ${number}번 답안으로 "${file.name}"을(를) 제출합니다.\n제출한 뒤에는 바꿀 수 없습니다. 제출할까요?`)) return;

    state.busy = true;
    el('submit_button').disabled = true;
    el('next_button').disabled = true;
    el('file_input').disabled = true;
    el('submit_button').textContent = '업로드 중...';
    const result = el('submit_result');
    result.textContent = '';
    try {
      const file_data = await read_base64(file);
      let image_data = '';
      try {
        image_data = await make_problem_png();
      } catch (error) {
        console.warn('문제 이미지 생성 실패 (서버가 SVG로 저장)', error);
      }
      const res = await api('submit', { number: number, file_data: file_data, image_data: image_data });
      if (res.ok) {
        state.submitted.push(number);
        state.current.submitted = true;
        set_submitted_view(true, format_clock(res.submitted_at, true));
      } else if (res.code === 'already') {
        state.current.submitted = true;
        set_submitted_view(true, '');
      } else if (res.code === 'wrong_number') {
        alert(res.message);
        load_problem();
      } else {
        result.textContent = res.message;
        result.className = 'submit_result bad';
      }
    } catch (error) {
      console.error(error);
      result.textContent = '파일을 읽지 못했습니다. 다시 선택해 주세요.';
      result.className = 'submit_result bad';
    } finally {
      state.busy = false;
      el('submit_button').textContent = '답안 제출';
      el('file_input').disabled = false;
      el('submit_button').disabled = !el('file_input').files[0];
      el('next_button').disabled = false;
      tick(); // 마감 후라면 다시 잠금
    }
  });

  // ---------- 다음 문제 ----------
  el('next_button').addEventListener('click', async () => {
    if (state.busy) return;
    const number = state.current.number;
    const is_last = number >= state.session.total;
    let text = is_last ? '시험을 마칩니다.' : `문제 ${number + 1}번으로 넘어갑니다.`;
    if (!state.current.submitted) text = `⚠ 문제 ${number}번 답안을 아직 제출하지 않았습니다.\n\n` + text;
    text += `\n넘어가면 문제 ${number}번으로 다시 돌아올 수 없습니다. 계속할까요?`;
    if (!confirm(text)) return;

    state.busy = true;
    el('next_button').disabled = true;
    el('submit_button').disabled = true;
    const res = await api('next', { number: number });
    state.busy = false;
    if (!res.ok) {
      el('next_button').disabled = false;
      alert(res.message);
      if (res.code === 'closed') show_message('시험이 종료되었습니다', res.message, '', true);
      return;
    }
    load_problem();
  });
}
