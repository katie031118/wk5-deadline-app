/* 연구자 컨트롤러 — ?mode=researcher 일 때만 app.js 가 불러온다.
 * 참가자 모드에서는 이 파일 자체가 로드되지 않으므로 패널·상태값·로그·단축키가 존재하지 않는다.
 * 제품 UI가 아니며, 외부 앱 전환·이탈·하차는 모두 여기서 시뮬레이션한다.
 */
(function () {
  'use strict';
  var P = window.Proto;
  if (!P || P.viewMode !== 'researcher') return;

  var SCREEN_LABEL = { standby: '대기(참가자 화면 비어 있음)', goal: '목표 확인', ott: 'OTT 시청', feed: '이탈 피드', reflection: '회고' };

  var panel = document.createElement('aside');
  panel.className = 'controller';
  panel.id = 'controller';
  panel.setAttribute('aria-label', '연구자용 컨트롤러');
  panel.innerHTML =
    '<span class="badge">TEST ONLY · 연구자 모드</span>' +
    '<h2>연구자 컨트롤러</h2>' +
    '<p class="note">제품 UI가 아닙니다. 이탈·하차는 이 패널로 <b>시뮬레이션</b>하며 실제 앱·위치·하차를 감지하지 않습니다.</p>' +
    '<dl class="state" id="c-state"></dl>' +

    '<fieldset class="c-group"><legend>이동(세션)</legend>' +
      '<label><input type="radio" name="c-rec" value="test"> 테스트 기록</label>' +
      '<label><input type="radio" name="c-rec" value="study"> 실험 기록 (실제 참가자)</label>' +
      '<button type="button" id="c-new">새 이동 시작</button>' +
    '</fieldset>' +

    '<fieldset class="c-group"><legend>진행 (연구자 조작)</legend>' +
      '<button type="button" id="c-task">과제 시작 · 목표 화면 제시</button>' +
      '<button type="button" id="c-drift">이탈 상황 발생</button>' +
      '<label for="c-reason" style="margin-top:8px">개입 응답 전 하차 시 기록할 사유</label>' +
      '<select id="c-reason">' +
        '<option value="trip_exit_scenario">시나리오상 하차 도착</option>' +
        '<option value="researcher_session_error">진행 오류·중단</option>' +
        '<option value="other">기타</option>' +
      '</select>' +
      '<button type="button" id="c-exit">하차 상황 발생</button>' +
      '<button type="button" id="c-back">연구자 되돌리기</button>' +
      '<p class="note">단축키(연구자 모드 전용): Alt+Shift+→ 다음 진행(과제 시작·이탈·하차, 개입 중에는 무시) / Alt+Shift+← 되돌리기</p>' +
    '</fieldset>' +

    '<fieldset class="c-group"><legend>로그</legend>' +
      '<label><input type="checkbox" id="c-cur" checked> 현재 이동만 보기</label>' +
      '<div class="c-row">' +
        '<button type="button" id="c-log-toggle">로그 보기</button>' +
        '<button type="button" id="c-export">JSON 내보내기</button>' +
      '</div>' +
      '<button type="button" id="c-clear" class="danger">로그 전체 삭제…</button>' +
      '<div class="c-confirm" id="c-confirm" role="alertdialog" aria-live="assertive" hidden>' +
        '<div id="c-confirm-msg"></div>' +
        '<div class="c-row"><button type="button" id="c-yes" class="danger">확인</button><button type="button" id="c-no">취소</button></div>' +
      '</div>' +
      '<p class="tz" id="c-tz"></p>' +
      '<div class="log" id="c-log" hidden></div>' +
    '</fieldset>';
  document.getElementById('stage').appendChild(panel);

  function $(id) { return document.getElementById(id); }
  var recRadios = Array.prototype.slice.call(panel.querySelectorAll('input[name="c-rec"]'));

  /* 기록 유형 선택은 기억하되 기본값은 테스트(실험 기록 오염 방지) */
  var pref = Store.getPref();
  var recType = pref.recordType === 'study' ? 'study' : 'test';
  recRadios.forEach(function (r) {
    r.checked = r.value === recType;
    r.addEventListener('change', function () {
      if (r.checked) { recType = r.value; Store.setPref({ recordType: recType }); }
    });
  });

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
  function renderState(st) {
    var rows = [
      ['session', (st.sessionId || '—') + (st.sessionId ? ' (' + (st.recordType === 'study' ? '실험' : '테스트') + ')' : '')],
      ['screen', SCREEN_LABEL[st.screen] + (st.sheetOpen ? ' + 개입' : '')],
      ['개입 노출', st.interventionShown ? '예 (이번 이동 1회 소진)' : '아니오'],
      ['개입 응답', st.interventionResponse || '—'],
      ['점수', (st.rating === null ? '—' : st.rating) + (st.completed ? ' (제출됨)' : '')]
    ];
    $('c-state').innerHTML = rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
    }).join('');

    $('c-task').disabled = !(st.sessionId && st.screen === 'standby');
    $('c-drift').disabled = st.screen !== 'ott';
    var canExit = st.screen === 'ott' || st.screen === 'feed';
    $('c-exit').disabled = !canExit;
    $('c-exit').textContent = st.sheetOpen ? '개입 중 긴급 종료 (하차 상황 발생)' : '하차 상황 발생';
    $('c-reason').disabled = !st.sheetOpen;
    $('c-back').disabled = !((st.screen === 'feed' && !st.sheetOpen) || (st.screen === 'reflection' && !st.completed));
    renderLog();
  }

  /* ---------- 로그 보기 ---------- */
  var logEl = $('c-log');
  var lastState = null;
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  var BASE = ['event', 'ts', 'sessionId', 'sessionType', 'source', 'viewMode', 'schemaVersion'];

  function renderLog() {
    if (logEl.hidden) return;
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
  $('c-log-toggle').addEventListener('click', function () {
    logEl.hidden = !logEl.hidden;
    this.textContent = logEl.hidden ? '로그 보기' : '로그 닫기';
    renderLog();
  });

  /* ---------- 동작 ---------- */
  $('c-new').addEventListener('click', function () {
    var st = P.getState();
    var inProgress = st.sessionId && st.screen !== 'standby' && !st.completed;
    var start = function () { P.actions.newTrip(recType); };
    if (inProgress) {
      ask('진행 중인 이동(' + st.sessionId + ')이 끝나지 않았습니다. 새 이동을 시작하면 개입 횟수와 회고 상태가 초기화됩니다. (로그는 보존)', start);
    } else {
      start();
    }
  });
  $('c-task').addEventListener('click', function () { P.actions.startTask(); });
  $('c-drift').addEventListener('click', function () { P.actions.drift(); });
  $('c-exit').addEventListener('click', function () { P.actions.exit($('c-reason').value); });
  $('c-back').addEventListener('click', function () { P.actions.back(); });

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
    var st = P.getState();
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (st.sheetOpen) return; // 개입 중 우회 방지: 긴급 종료는 패널 버튼으로만
      if (st.screen === 'standby' && st.sessionId) P.actions.startTask();
      else if (st.screen === 'ott') P.actions.drift();
      else if (st.screen === 'feed') P.actions.exit('trip_exit_scenario');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      P.actions.back();
    }
  });

  P.onRender(function (st) { lastState = st; renderState(st); });
})();
