/* TEST CONTROLLER — ?mode=researcher 일 때만 app.js 가 불러온다.
 * 참가자 모드에서는 이 파일 자체가 로드되지 않으므로 패널·상태값·로그·단축키가 존재하지 않는다.
 * 제품 UI가 아니며, 외부 앱 전환·이탈·하차는 모두 여기서 시뮬레이션한다.
 */
(function () {
  'use strict';
  var P = window.Proto;
  if (!P || P.viewMode !== 'researcher') return;

  var STEPS = [
    [1, '01', '목표 확인'],
    [2, '02', 'OTT'],
    [3, '03', '이탈 앱'],
    [4, '04', '목표 리마인드'],
    [5, '05', '하차 후 회고']
  ];

  var panel = document.createElement('aside');
  panel.className = 'controller';
  panel.id = 'controller';
  panel.setAttribute('aria-label', '연구자용 테스트 컨트롤러');
  panel.innerHTML =
    '<span class="badge">TEST CONTROLLER</span>' +
    '<p class="note">실제 서비스 UI가 아닌 테스트용 기능입니다. 이탈·하차는 시뮬레이션이며 실제 앱·위치·하차를 감지하지 않습니다.</p>' +
    '<p class="sess" id="c-sess"></p>' +

    '<h2>단계</h2>' +
    '<ol class="steps" id="c-steps">' +
      STEPS.map(function (s) {
        return '<li><button type="button" class="step" data-step="' + s[0] + '"><b>' + s[1] + '</b> ' + s[2] + '</button></li>';
      }).join('') +
    '</ol>' +
    '<div class="c-row">' +
      '<button type="button" id="c-prev">← 이전</button>' +
      '<button type="button" id="c-next">다음 →</button>' +
    '</div>' +
    '<button type="button" id="c-home">처음으로</button>' +
    '<p class="note" id="c-nav-note"></p>' +

    '<h2>상황 시뮬레이션</h2>' +
    '<button type="button" id="c-drift">이탈 상황 발생</button>' +
    '<label for="c-reason" class="c-reason-label" id="c-reason-label">개입 응답 전 하차 시 기록할 사유</label>' +
    '<select id="c-reason">' +
      '<option value="trip_exit_scenario">시나리오상 하차 도착</option>' +
      '<option value="researcher_session_error">진행 오류·중단</option>' +
      '<option value="other">기타</option>' +
    '</select>' +
    '<button type="button" id="c-exit">하차 상황 발생</button>' +
    '<p class="count" id="c-count"></p>' +
    '<p class="note">단축키: Alt+Shift+→ 다음, Alt+Shift+← 이전 (테스트 기록에서만)</p>' +

    '<details class="c-logbox" id="c-logbox"><summary>로그</summary>' +
      '<label class="c-cur"><input type="checkbox" id="c-cur" checked> 현재 이동만 보기</label>' +
      '<div class="c-row">' +
        '<button type="button" id="c-export">JSON 내보내기</button>' +
        '<button type="button" id="c-clear" class="danger">전체 삭제…</button>' +
      '</div>' +
      '<div class="c-confirm" id="c-confirm" role="alertdialog" aria-live="assertive" hidden>' +
        '<div id="c-confirm-msg"></div>' +
        '<div class="c-row"><button type="button" id="c-yes" class="danger">확인</button><button type="button" id="c-no">취소</button></div>' +
      '</div>' +
      '<p class="tz" id="c-tz"></p>' +
      '<div class="log" id="c-log"></div>' +
    '</details>';
  document.getElementById('stage').appendChild(panel);

  function $(id) { return document.getElementById(id); }
  var stepBtns = Array.prototype.slice.call(panel.querySelectorAll('.step'));

  var tz = Logger.tzInfo();
  $('c-tz').textContent = '저장: UTC ISO 8601(Z) · 표시: ' + (tz.name || '로컬') + ' ' + tz.offset;

  /* ---------- 확인 절차 ---------- */
  var pendingYes = null;
  function ask(message, onYes) {
    $('c-confirm-msg').textContent = message;
    $('c-confirm').hidden = false;
    pendingYes = onYes;
    $('c-yes').focus();
  }
  function closeAsk() { $('c-confirm').hidden = true; pendingYes = null; }
  $('c-yes').addEventListener('click', function () { var fn = pendingYes; closeAsk(); if (fn) fn(); });
  $('c-no').addEventListener('click', closeAsk);

  /* ---------- 상태 표시 및 버튼 활성 조건 ---------- */
  var lastState = null;
  function renderState(st) {
    lastState = st;
    var isTest = st.sessionId && st.recordType === 'test';
    var step = P.stepOf(st);

    $('c-sess').textContent = (st.sessionId || '—') + (st.sessionId ? ' · ' + (st.recordType === 'study' ? '실험 기록' : '테스트 기록') : '');

    stepBtns.forEach(function (b) {
      var n = Number(b.dataset.step);
      b.classList.toggle('on', n === step);
      if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.disabled = !isTest;
    });
    $('c-prev').disabled = !isTest || step <= 1;
    $('c-next').disabled = !isTest || step >= 5;
    $('c-nav-note').textContent = !isTest
      ? '빠른 이동은 테스트 기록에서만 사용할 수 있습니다.'
      : (st.sheetPreview ? '04는 미리보기입니다. 개입 횟수에 집계되지 않습니다.' : '단계 이동은 연구자 조작으로 기록됩니다.');

    $('c-drift').disabled = st.screen !== 'ott';
    var live = st.sheetOpen && !st.sheetPreview;
    $('c-exit').disabled = !(st.screen === 'ott' || st.screen === 'feed');
    $('c-exit').textContent = live ? '개입 중 긴급 종료 (하차 상황 발생)' : '하차 상황 발생';
    $('c-reason').hidden = !live;
    $('c-reason-label').hidden = !live;
    $('c-count').textContent = '개입 노출: ' + (st.interventionShown ? 1 : 0) + ' / 1';
    renderLog();
  }

  /* ---------- 로그 보기 ---------- */
  var logEl = $('c-log');
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  var BASE = ['event', 'ts', 'sessionId', 'sessionType', 'source', 'viewMode', 'schemaVersion'];

  function renderLog() {
    if (!$('c-logbox').open) return;
    var all = Logger.all();
    var onlyCur = $('c-cur').checked && lastState && lastState.sessionId;
    var list = onlyCur ? all.filter(function (e) { return e.sessionId === lastState.sessionId; }) : all;
    if (!list.length) { logEl.textContent = '(표시할 기록 없음 · 전체 ' + all.length + '건)'; return; }
    logEl.innerHTML = '<div>표시 ' + list.length + ' / 전체 ' + all.length + '건</div>' + list.map(function (e) {
      var extra = Object.keys(e).filter(function (k) { return BASE.indexOf(k) < 0; })
        .map(function (k) { return k + '=' + e[k]; }).join(' ');
      var type = e.sessionType === 'study' ? 'S' : e.sessionType === 'test' ? 'T' : e.schemaVersion ? '-' : 'v1';
      return '<div title="UTC ' + esc(e.ts) + '"><span class="t">' + esc(Logger.formatLocal(e.ts)) + '</span> ' +
        esc(e.sessionId || '-') + ' <span class="tag">' + type + '</span> ' + esc(e.source || '-') + ' <b>' + esc(e.event) + '</b> ' + esc(extra) + '</div>';
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }
  Logger.onChange(renderLog);
  $('c-cur').addEventListener('change', renderLog);
  $('c-logbox').addEventListener('toggle', renderLog);

  /* ---------- 동작 ---------- */
  stepBtns.forEach(function (b) {
    b.addEventListener('click', function () { P.actions.goto(Number(b.dataset.step), 'step'); });
  });
  $('c-prev').addEventListener('click', function () { P.actions.prev(); });
  $('c-next').addEventListener('click', function () { P.actions.next(); });

  /* 처음으로: 언제든 사용 가능. 항상 새 *테스트* 세션을 만들고(개입·점수·완료 초기화) 01 목표 확인으로 이동.
   * 현재가 실험 기록 세션이면 확인 후 테스트 세션으로 전환한다. */
  $('c-home').addEventListener('click', function () {
    var st = P.getState();
    var go = function () { P.actions.newTrip('test', { toGoal: true }); };
    if (st.sessionId && st.recordType === 'study') {
      ask('현재는 실험 기록 세션(' + st.sessionId + ')입니다. 처음으로 가면 이 세션을 종료하고 새 테스트 세션으로 전환합니다. 개입 횟수와 회고 상태는 초기화되며 로그는 보존됩니다. 계속할까요?', go);
    } else {
      go();
    }
  });

  $('c-drift').addEventListener('click', function () { P.actions.drift(); });
  $('c-exit').addEventListener('click', function () { P.actions.exit($('c-reason').value); });

  $('c-export').addEventListener('click', function () {
    P.logResearcher('log_exported', { eventCountBefore: Logger.all().length });
    Logger.exportJSON();
  });
  $('c-clear').addEventListener('click', function () {
    var n = Logger.all().length;
    ask('기록 ' + n + '건을 영구 삭제합니다. 삭제 전에 JSON 내보내기를 권장합니다. 계속할까요?', function () {
      Logger.clear();
      P.logResearcher('log_cleared', { removedCount: n });
    });
  });

  /* 연구자 단축키: 일반 화살표(회고 점수 조작 등)와 충돌하지 않도록 Alt+Shift 조합만 사용 */
  document.addEventListener('keydown', function (e) {
    if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); P.actions.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); P.actions.prev(); }
  });

  P.onRender(renderState);
})();
