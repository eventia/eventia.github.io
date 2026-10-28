// ===== 문제 설정 — 도면 추가·교체 시 이 부분만 수정 =====
// image_width/height: 원본 이미지 픽셀 크기
// font_size: 원본 이미지 기준 숫자 크기(px)
// labels: 도면 속 A/B/C 글자의 중심 픽셀 좌표(x, y)와 회전 각도(세로 치수는 -90)
//         흰 바탕 숫자가 원래 글자와 밑줄을 덮음
const problems = [
  {
    title: '문제 1',
    image_src: '../images/work01.png',
    image_width: 938,
    image_height: 586,
    font_size: 28,
    labels: {
      A: { x: 428.5, y: 372.5, rotate: -90 },
      B: { x: 241, y: 523.7, rotate: 0 },
    },
  },
  {
    title: '문제 2',
    image_src: '../images/work02.png',
    image_width: 1062,
    image_height: 825,
    font_size: 28,
    labels: {
      A: { x: 110.5, y: 467, rotate: 0 },
      B: { x: 277.5, y: 467, rotate: 0 },
      C: { x: 447.5, y: 467, rotate: 0 },
    },
  },
];

// 문제 지시문 (임시 문구)
const instruction_text = '아래 도면을 주어진 치수(A, B, C)로 작도하시오. (단위: mm)';

// ===== 치수 계산 =====

// 자릿수를 길이로 변환 (0은 10으로 간주)
function digit_to_length(digit) {
  return (digit === 0 ? 10 : digit) * 10;
}

// 학번 끝 3자리로 A, B, C 계산
function make_dimensions(student_id) {
  const last_three = student_id.slice(-3).split('').map(Number);
  return {
    A: digit_to_length(last_three[0]),
    B: digit_to_length(last_three[1]),
    C: digit_to_length(last_three[2]),
  };
}

// 입력값 검증 — 오류 메시지 반환 (없으면 빈 문자열)
function validate_input(student_name, student_class, student_id) {
  let name_error = '';
  let class_error = '';
  let id_error = '';
  if (student_name === '') {
    name_error = '이름을 입력하세요.';
  }
  if (student_class === '') {
    class_error = '반을 입력하세요.';
  }
  if (student_id === '') {
    id_error = '학번을 입력하세요.';
  } else if (!/^\d+$/.test(student_id)) {
    id_error = '학번은 숫자만 입력하세요.';
  } else if (student_id.length < 3) {
    id_error = '학번은 3자리 이상이어야 합니다.';
  }
  return { name_error, class_error, id_error };
}

// Node 테스트용 내보내기 (브라우저에서는 무시됨)
if (typeof module !== 'undefined') {
  module.exports = { digit_to_length, make_dimensions, validate_input };
}

// ===== 화면 처리 =====
if (typeof document !== 'undefined') {
  const input_section = document.getElementById('input_section');
  const exam_section = document.getElementById('exam_section');
  const exam_form = document.getElementById('exam_form');
  const name_input = document.getElementById('student_name');
  const class_input = document.getElementById('student_class');
  const id_input = document.getElementById('student_id');
  const name_error_el = document.getElementById('name_error');
  const class_error_el = document.getElementById('class_error');
  const id_error_el = document.getElementById('id_error');
  const problem_list = document.getElementById('problem_list');

  document.getElementById('instruction').textContent = instruction_text;

  // 문제별 제목 + 도면 영역 생성
  const drawing_wraps = problems.map((problem) => {
    const block = document.createElement('div');
    block.className = 'problem';
    const title = document.createElement('h2');
    title.textContent = problem.title;
    const drawing_wrap = document.createElement('div');
    drawing_wrap.className = 'drawing_wrap';
    const drawing_image = document.createElement('img');
    drawing_image.src = problem.image_src;
    drawing_image.alt = problem.title + ' 도면';
    drawing_wrap.appendChild(drawing_image);
    block.append(title, drawing_wrap);
    problem_list.appendChild(block);
    return drawing_wrap;
  });

  // 도면 위 치수 숫자 배치 — 픽셀 좌표를 이미지 대비 %로 변환
  function render_labels(dimensions) {
    problems.forEach((problem, index) => {
      const drawing_wrap = drawing_wraps[index];
      drawing_wrap.querySelectorAll('.dimension_label').forEach((el) => el.remove());
      for (const [key, pos] of Object.entries(problem.labels)) {
        const label = document.createElement('span');
        label.className = 'dimension_label';
        label.textContent = dimensions[key];
        label.style.left = (pos.x / problem.image_width) * 100 + '%';
        label.style.top = (pos.y / problem.image_height) * 100 + '%';
        label.style.fontSize = (problem.font_size / problem.image_width) * 100 + 'cqw';
        label.style.transform = `translate(-50%, -50%) rotate(${pos.rotate || 0}deg)`;
        drawing_wrap.appendChild(label);
      }
    });
  }

  // 문제 화면 표시
  function show_exam(student_name, student_class, student_id) {
    const dimensions = make_dimensions(student_id);
    document.getElementById('info_name').textContent = student_name;
    document.getElementById('info_class').textContent = student_class;
    document.getElementById('info_id').textContent = student_id;
    for (const key of ['A', 'B', 'C']) {
      document.getElementById('value_' + key).textContent = dimensions[key];
    }
    render_labels(dimensions);
    input_section.hidden = true;
    exam_section.hidden = false;
  }

  exam_form.addEventListener('submit', (event) => {
    event.preventDefault();
    const student_name = name_input.value.trim();
    const student_class = class_input.value.trim();
    const student_id = id_input.value.trim();
    const { name_error, class_error, id_error } = validate_input(student_name, student_class, student_id);

    name_error_el.textContent = name_error;
    class_error_el.textContent = class_error;
    id_error_el.textContent = id_error;
    name_input.classList.toggle('invalid', name_error !== '');
    class_input.classList.toggle('invalid', class_error !== '');
    id_input.classList.toggle('invalid', id_error !== '');

    if (name_error === '' && class_error === '' && id_error === '') {
      show_exam(student_name, student_class, student_id);
    }
  });

  // 다시 입력
  document.getElementById('reset_button').addEventListener('click', () => {
    exam_section.hidden = true;
    input_section.hidden = false;
    name_input.focus();
  });

  // 화면 캡처 — 문제 화면을 PNG 이미지로 저장
  const capture_button = document.getElementById('capture_button');
  capture_button.addEventListener('click', async () => {
    capture_button.disabled = true;
    capture_button.textContent = '저장 중...';
    try {
      const canvas = await html2canvas(exam_section, { scale: 2, backgroundColor: '#ffffff' });
      const student_name = document.getElementById('info_name').textContent;
      const student_class = document.getElementById('info_class').textContent;
      const student_id = document.getElementById('info_id').textContent;
      const download_link = document.createElement('a');
      download_link.download = `중간고사_${student_class}_${student_id}_${student_name}.png`;
      download_link.href = canvas.toDataURL('image/png');
      download_link.click();
    } catch (error) {
      alert('화면 캡처에 실패했습니다. 키보드 캡처(Win+Shift+S)를 이용하세요.');
      console.error(error);
    } finally {
      capture_button.disabled = false;
      capture_button.textContent = '화면 캡처';
    }
  });
}
