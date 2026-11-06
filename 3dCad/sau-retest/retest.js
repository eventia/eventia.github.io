// ===== 재시험 화면 처리 — 시간·진행 판단은 서버(Apps Script)가 하고, 여기서는 표시만 담당 =====

const max_file_bytes = 10 * 1024 * 1024;
const storage_key = 'retest_student';

// 입력값 검증 — 오류 메시지 반환 (없으면 빈 문자열)
function validate_input(student_name, student_class, student_id) {
  let name_error = '';
  let class_error = '';
  let id_error = '';
  if (student_name === '') name_error = '이름을 입력하세요.';
  if (student_class === '') class_error = '반을 입력하세요.';
  if (student_id === '') id_error = '학번을 입력하세요.';
  else if (!/^\d+$/.test(student_id)) id_error = '학번은 숫자만 입력하세요.';
  else if (student_id.length < 3) id_error = '학번은 3자리 이상이어야 합니다.';
  return { name_error, class_error, id_error };
}

// 남은 시간 표기 (h:mm:ss 또는 mm:ss)
function format_remain(ms) {
  const total_sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total_sec / 3600);
  const m = Math.floor((total_sec % 3600) / 60);
  const s = total_sec % 60;
  const two = (n) => String(n).padStart(2, '0');
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

// 회차 이름 ("1회차", "테스트 회차")
function session_label(session) {
  return session.label || session.no + '회차';
}

// localStorage 접근 (막혀 있어도 동작하도록)
function storage_get(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storage_set(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* 무시 */ }
}

if (typeof module !== 'undefined') {
  module.exports = { validate_input, format_remain };
}

if (typeof document !== 'undefined') {
  const el = (id) => document.getElementById(id);
  const sections = ['input_section', 'message_section', 'exam_section', 'done_section'];

  // 화면 상태
  const state = {
    student: null, // { student_id, name, class_name, token }
    offset_ms: 0, // 서버 시각 - 내 컴퓨터 시각
    phase: '',
    session: null,
    number: 1,
    total: 5,
    submitted: [],
    current: null, // 현재 문제 { number, level, submitted }
    busy: false,
    waiting_for_start: false,
  };

  const server_now = () => Date.now() + state.offset_ms;

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

  // ---------- 서버 통신 ----------
  // Content-Type 을 지정하지 않아(text/plain) CORS 사전 요청 없이 전송
  async function api(action, extra) {
    const body = Object.assign({ action: action }, state.student, extra || {});
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

  function save_token(token) {
    if (!token) return;
    state.student.token = token;
    storage_set('retest_token_' + state.student.student_id, token);
  }

  // ---------- 입장 ----------
  async function enter() {
    show_message('서버 확인 중...', '잠시만 기다리세요.');
    const res = await api('status');
    if (!res.ok) {
      show_message('입장할 수 없습니다', res.message, '', true);
      return;
    }
    state.session = res.session;
    state.total = res.total;
    if (res.phase === 'waiting') {
      state.waiting_for_start = true;
      show_message(
        `${session_label(res.session)} 시험 시작까지`,
        `${new Date(res.session.start).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' })} ` +
          `시작 ${format_clock(res.session.start)} · 종료 ${format_clock(res.session.end)}\n시작 시각이 되면 첫 문제가 자동으로 나타납니다. 이 창을 닫지 마세요.`,
        format_remain(res.session.start - server_now())
      );
    } else if (res.phase === 'open' || res.phase === 'grace') {
      load_problem();
    } else if (res.phase === 'other_session') {
      show_message('응시할 수 없습니다', res.message, '', true);
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
        // 시계 차이로 조금 일찍 요청한 경우 다시 대기
        setTimeout(enter, 2000);
        return;
      }
      show_message('문제를 열 수 없습니다', res.message, '', true);
      return;
    }
    save_token(res.token);
    state.phase = res.phase;
    state.session = res.session;
    state.total = res.total;
    state.number = res.number;
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
    el('info_name').textContent = state.student.name;
    el('info_class').textContent = state.student.class_name;
    el('info_id').textContent = state.student.student_id;
    el('end_text').textContent = `${session_label(state.session)} · 종료 ${format_clock(state.session.end)} (제출 마감 ${format_clock(state.session.deadline)})`;
    el('problem_number').textContent = p.number;
    el('problem_total').textContent = state.total;
    el('problem_level').textContent = p.level;
    el('problem_level').className = 'level ' + (p.level === '쉬움' ? 'easy' : 'medium');
    el('drawing').innerHTML = p.svg; // 서버(내 Apps Script)가 만든 SVG

    // 진행 단계 동그라미
    const steps = el('steps');
    steps.innerHTML = '';
    for (let n = 1; n <= state.total; n++) {
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
    el('next_button').textContent = p.number >= state.total ? '시험 마치기' : '다음 문제 →';
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
    for (let n = 1; n <= state.total; n++) {
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
        // 학생들이 한꺼번에 요청하지 않도록 0~2초 분산
        setTimeout(load_problem, Math.random() * 2000);
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

  // ---------- 입력 폼 ----------
  const saved = JSON.parse(storage_get(storage_key) || 'null');
  if (saved) {
    el('student_name').value = saved.name || '';
    el('student_class').value = saved.class_name || '';
    el('student_id').value = saved.student_id || '';
  }

  el('exam_form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = el('student_name').value.trim();
    const class_name = el('student_class').value.trim();
    const student_id = el('student_id').value.trim();
    const errors = validate_input(name, class_name, student_id);
    el('name_error').textContent = errors.name_error;
    el('class_error').textContent = errors.class_error;
    el('id_error').textContent = errors.id_error;
    el('student_name').classList.toggle('invalid', errors.name_error !== '');
    el('student_class').classList.toggle('invalid', errors.class_error !== '');
    el('student_id').classList.toggle('invalid', errors.id_error !== '');
    if (errors.name_error || errors.class_error || errors.id_error) return;

    storage_set(storage_key, JSON.stringify({ name, class_name, student_id }));
    state.student = {
      student_id: student_id,
      name: name,
      class_name: class_name,
      token: storage_get('retest_token_' + student_id) || '',
    };
    enter();
  });

  el('message_button').addEventListener('click', () => {
    state.waiting_for_start = false;
    show_section('input_section');
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
      const res = await api('submit', { number: number, file_data: file_data });
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
    const is_last = number >= state.total;
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
