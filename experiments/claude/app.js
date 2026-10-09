/* 퇴근길 목표 PoC — 모든 외부 앱 전환·이탈·하차는 웹 내부 시뮬레이션
 *
 * 모드
 *  - 참가자(기본): 프레임만 표시. 연구자 조작·단축키·로그 UI 없음.
 *  - 연구자(?mode=researcher): researcher.js 를 불러와 TEST CONTROLLER 를 추가.
 *
 * 이벤트 source
 *  - participant: 프레임 안에서의 조작
 *  - researcher : 연구자 패널/단축키 조작 (이탈·하차 등 시뮬레이션은 simulated:true)
 *  - system     : 규칙에 따라 화면이 표시된 사실(개입 표시, 회고 노출 등)
 *
 * 진행 상태(Store)는 localStorage 에 저장되어 새로고침해도 같은 이동의 개입 횟수가 초기화되지 않는다.
 * 새 이동은 연구자의 [처음으로](=newTrip)로만 만들어진다.
 *
 * 단계(step): 1 목표 확인 · 2 OTT · 3 이탈 앱 · 4 목표 리마인드(03 위 bottom sheet) · 5 하차 후 회고
 * 단계 이동(goto)은 테스트 기록 세션 전용 연구자 기능이며, 04 진입은 미리보기일 뿐
 * interventionShown 과 intervention_shown 이벤트에 영향을 주지 않는다.
 */
(function () {
  'use strict';

  var viewMode = new URLSearchParams(location.search).get('mode') === 'researcher' ? 'researcher' : 'participant';
  document.body.classList.add('mode-' + viewMode);

  function $(id) { return document.getElementById(id); }

  var screens = { standby: $('s0'), goal: $('s1'), ott: $('s2'), feed: $('s3'), reflection: $('s5') };
  var sheet = $('sheet');
  var scrim = $('scrim');
  var feed = $('feed');
  var returnBtn = $('return-btn');
  var continueBtn = $('continue-btn');
  var doneBtn = $('done-btn');
  var scaleSet = $('scale');
  var radios = Array.prototype.slice.call(document.querySelectorAll('#scale input[type="radio"]'));

  /* 피드 플레이스홀더 (실제 이미지·무한 스크롤 없음) */
  var postTpl = $('post-tpl');
  for (var i = 0; i < 5; i++) feed.appendChild(postTpl.content.cloneNode(true));

  /* ---------- 상태 ---------- */
  function defaultState() {
    return {
      v: 2,
      sessionId: null,
      recordType: 'test',          // 'test' | 'study'
      screen: 'standby',           // standby | goal | ott | feed | reflection
      sheetOpen: false,
      sheetPreview: false,         // true = 연구자 단계 이동으로 연 04 미리보기 (실제 개입 아님)
      interventionShown: false,    // 이동 1회당 최대 1회 개입 (새로고침으로 초기화되지 않음)
      interventionResponse: null,  // null | 'return' | 'continue' | 'aborted_by_researcher'
      rating: null,
      completed: false,
      exitFrom: null               // 하차가 발생한 화면 ('ott' | 'feed')
    };
  }

  /* 현재 단계 번호 (대기 화면은 0) */
  function stepOf(s) {
    if (s.screen === 'goal') return 1;
    if (s.screen === 'ott') return 2;
    if (s.screen === 'feed') return s.sheetOpen ? 4 : 3;
    if (s.screen === 'reflection') return 5;
    return 0;
  }

  var state = Store.get() || defaultState();
  var shown = { screen: null, sheet: false };
  var renderListeners = [];

  function load() { state = Store.get() || defaultState(); return state; }
  function commit() { Store.set(state); render(); }

  function ctx(source) {
    return {
      sessionId: state.sessionId,
      sessionType: state.sessionId ? state.recordType : null,
      source: source,
      viewMode: viewMode
    };
  }
  function log(event, source, extra) { return Logger.log(event, ctx(source), extra); }
  function flush(queue) { queue.forEach(function (q) { log(q[0], q[1], q[2]); }); }

  /* ---------- 렌더 ---------- */
  function render() {
    var sc = state.screen;
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === sc);
    });

    var open = state.sheetOpen && sc === 'feed';
    scrim.classList.toggle('active', open);
    sheet.classList.toggle('active', open);
    sheet.setAttribute('aria-hidden', String(!open));
    if (open) screens.feed.setAttribute('inert', ''); else screens.feed.removeAttribute('inert');

    radios.forEach(function (r) { r.checked = state.rating === Number(r.value); });
    scaleSet.disabled = state.completed;
    doneBtn.disabled = state.rating === null || state.completed;
    doneBtn.textContent = state.completed ? '완료됨' : '완료';

    /* 초점 이동: 개입이 열리면 시트 안으로, 닫히면 이동한 화면의 적절한 위치로 */
    var screenChanged = shown.screen !== null && shown.screen !== sc;
    if (open && !shown.sheet) {
      returnBtn.focus({ preventScroll: true });
    } else if (!open && shown.sheet && !screenChanged) {
      feed.focus({ preventScroll: true });
    } else if (screenChanged && !open) {
      screens[sc].focus({ preventScroll: true });
    }
    shown = { screen: sc, sheet: open };

    renderListeners.forEach(function (fn) { fn(state); });
  }

  /* ---------- 참가자 조작 ---------- */
  function goalStartClicked() {
    load();
    if (state.screen !== 'goal') return;
    state.screen = 'ott';
    commit();
    flush([
      ['goal_start_clicked', 'participant', null],
      ['screen_changed', 'participant', { from: 'goal', to: 'ott', via: 'goal_start_clicked' }]
    ]);
  }

  function interventionReturn() {
    load();
    if (!state.sheetOpen || state.screen !== 'feed') return;
    var preview = !!state.sheetPreview;
    state.sheetOpen = false;
    state.sheetPreview = false;
    state.screen = 'ott';
    if (!preview) state.interventionResponse = 'return';
    commit();
    if (preview) {
      /* 연구자 미리보기 중의 버튼 조작은 참가자 선택으로 기록하지 않는다 */
      flush([
        ['intervention_preview_closed', 'researcher', { choice: 'return', preview: true }],
        ['screen_changed', 'researcher', { from: 'feed', to: 'ott', via: 'intervention_preview_closed' }]
      ]);
      return;
    }
    flush([
      ['intervention_return_clicked', 'participant', null],
      ['screen_changed', 'participant', { from: 'feed', to: 'ott', via: 'intervention_return_clicked' }]
    ]);
  }

  function interventionContinue() {
    load();
    if (!state.sheetOpen || state.screen !== 'feed') return;
    var preview = !!state.sheetPreview;
    state.sheetOpen = false;
    state.sheetPreview = false;
    if (!preview) state.interventionResponse = 'continue';
    commit();
    if (preview) {
      flush([['intervention_preview_closed', 'researcher', { choice: 'continue', preview: true }]]);
      return;
    }
    flush([['intervention_continue_clicked', 'participant', null]]);
  }

  function selectRating(value) {
    load();
    if (state.screen !== 'reflection' || state.completed) { render(); return; }
    var prev = state.rating;
    if (prev === value) return;
    state.rating = value;
    commit();
    flush([['reflection_rating_selected', 'participant', { rating: value, previousRating: prev }]]);
  }

  function completeReflection() {
    load();
    if (state.screen !== 'reflection' || state.rating === null || state.completed) return;
    state.completed = true;
    commit();
    flush([['reflection_completed', 'participant', { rating: state.rating }]]);
  }

  /* ---------- 연구자 조작 (연구자 모드에서만 호출됨) ---------- */
  var researcherActions = {
    /* 새 이동(= 처음으로): 개입 횟수·회고 상태 초기화. 로그는 보존.
     * opts.toGoal 이면 대기 화면 없이 01 목표 확인으로 시작한다. */
    newTrip: function (recordType, opts) {
      load();
      var type = recordType === 'study' ? 'study' : 'test';
      var next = defaultState();
      next.sessionId = Logger.nextSessionId();
      next.recordType = type;
      var toGoal = !!(opts && opts.toGoal);
      if (toGoal) next.screen = 'goal';
      state = next;
      commit();
      var q = [['prototype_session_start', 'researcher', { recordType: type, via: toGoal ? 'home' : 'new_trip' }]];
      if (toGoal) {
        q.push(['researcher_nav', 'researcher', { from: null, to: 1, method: 'home', preview: false }]);
        q.push(['task_started', 'researcher', null]);
        q.push(['screen_changed', 'researcher', { from: 'standby', to: 'goal', via: 'home' }]);
        q.push(['goal_screen_shown', 'system', { trigger: 'home' }]);
      }
      flush(q);
    },

    /* 단계 이동 (테스트 기록 세션 전용). 04 는 미리보기: 개입 집계·intervention_shown 없음. */
    goto: function (step, method) {
      load();
      if (!state.sessionId || state.recordType !== 'test') return;
      step = Math.max(1, Math.min(5, step));
      var from = stepOf(state);
      if (from === step) return;

      var fromScreen = state.screen;
      var q = [];
      var extra = { from: from, to: step, method: method || 'step', preview: step === 4 };

      /* 실제 개입(응답 대기 중)을 응답 없이 떠나면 참가자 선택과 구별해 기록 */
      if (state.sheetOpen && !state.sheetPreview) {
        q.push(['intervention_aborted_by_researcher', 'researcher', { reason: 'researcher_nav', participantResponse: null, fromScreen: fromScreen }]);
        state.interventionResponse = 'aborted_by_researcher';
      }
      /* 회고를 떠나면 점수·완료 초기화 (테스트 세션 한정) */
      if (fromScreen === 'reflection') {
        extra.ratingCleared = state.rating !== null || state.completed;
        state.rating = null;
        state.completed = false;
      }

      state.sheetOpen = false;
      state.sheetPreview = false;
      if (step === 1) state.screen = 'goal';
      else if (step === 2) state.screen = 'ott';
      else if (step === 3) state.screen = 'feed';
      else if (step === 4) { state.screen = 'feed'; state.sheetOpen = true; state.sheetPreview = true; }
      else {
        state.screen = 'reflection';
        state.exitFrom = (fromScreen === 'ott' || fromScreen === 'feed') ? fromScreen : (state.exitFrom || 'ott');
      }
      commit();

      q.unshift(['researcher_nav', 'researcher', extra]);
      q.push(['screen_changed', 'researcher', { from: fromScreen, to: state.screen, via: 'researcher_nav' }]);
      flush(q);
    },

    prev: function () { researcherActions.goto(stepOf(load()) - 1, 'prev'); },
    next: function () { researcherActions.goto(stepOf(load()) + 1, 'next'); },

    /* 이탈 앱 진입 시뮬레이션 — 실제 앱 감지가 아님. 실제 규칙(첫 이탈에만 개입) 적용. */
    drift: function () {
      load();
      if (state.screen !== 'ott') return;
      var shownBefore = state.interventionShown;
      var q = [
        ['drift_app_entered', 'researcher', { simulated: true, detection: 'researcher_simulation', interventionShownBefore: shownBefore }],
        ['screen_changed', 'researcher', { from: 'ott', to: 'feed', via: 'drift_app_entered' }]
      ];
      state.screen = 'feed';
      if (!shownBefore) {
        state.interventionShown = true;
        state.sheetOpen = true;
        state.sheetPreview = false;
        q.push(['intervention_shown', 'system', { trigger: 'first_drift_in_trip' }]);
      }
      commit();
      flush(q);
    },

    /* 하차 시뮬레이션. 개입 응답 전이면 참가자 선택과 구별해 별도 기록한다. */
    exit: function (reason) {
      load();
      if (state.screen !== 'ott' && state.screen !== 'feed') return;
      var from = state.screen;
      var open = state.sheetOpen;
      var live = open && !state.sheetPreview;
      var q = [['trip_exit_triggered', 'researcher', { simulated: true, detection: 'researcher_simulation', fromScreen: from, interventionOpen: live }]];
      if (live) {
        q.push(['intervention_aborted_by_researcher', 'researcher', {
          reason: reason || 'unspecified',
          participantResponse: null,
          fromScreen: from
        }]);
        state.interventionResponse = 'aborted_by_researcher';
      }
      state.sheetOpen = false;
      state.sheetPreview = false;
      state.exitFrom = from;
      state.screen = 'reflection';
      q.push(['screen_changed', 'researcher', { from: from, to: 'reflection', via: 'trip_exit_triggered' }]);
      q.push(['reflection_shown', 'system', { trigger: 'trip_exit_triggered' }]);
      commit();
      flush(q);
    }
  };

  /* ---------- 이벤트 바인딩 ---------- */
  $('start-btn').addEventListener('click', goalStartClicked);
  returnBtn.addEventListener('click', interventionReturn);
  continueBtn.addEventListener('click', interventionContinue);
  radios.forEach(function (r) {
    r.addEventListener('change', function () { if (r.checked) selectRating(Number(r.value)); });
  });
  doneBtn.addEventListener('click', completeReflection);

  /* 개입 중: 초점을 시트 안에 가두고, Esc 등으로 응답 없이 닫히지 않게 한다 */
  document.addEventListener('keydown', function (e) {
    if (!state.sheetOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); return; }
    if (e.key === 'Tab') {
      var first = returnBtn, last = continueBtn;
      var active = document.activeElement;
      if (!sheet.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* 다른 창(참가자 창 ↔ 연구자 창)에서 상태가 바뀌면 반영 */
  window.addEventListener('storage', function (e) {
    if (e.key === Store.KEY) { load(); render(); }
  });

  /* ---------- 공개 API (연구자 패널용) ---------- */
  window.Proto = {
    viewMode: viewMode,
    actions: researcherActions,
    stepOf: stepOf,
    getState: function () { return JSON.parse(JSON.stringify(load())); },
    onRender: function (fn) { renderListeners.push(fn); fn(state); },
    logResearcher: function (event, extra) { load(); return log(event, 'researcher', extra); }
  };

  /* ---------- 시작 ---------- */
  var restored = !!state.sessionId;
  var autoStarted = false;
  if (!restored) {
    /* 처음 열면 빈 대기 화면 없이 바로 목표 화면. 세션은 자동 생성(연구자 모드는 테스트, 참가자 URL은 실험 기록). */
    state = defaultState();
    state.sessionId = Logger.nextSessionId();
    state.recordType = viewMode === 'researcher' ? 'test' : 'study';
    state.screen = 'goal';
    autoStarted = true;
  } else if (state.screen === 'standby') {
    state.screen = 'goal'; // 이전 버전에서 저장된 대기 상태는 목표 화면으로 이어간다
  }
  Store.set(state);
  render();
  log('page_loaded', 'system', {
    restored: restored,
    screen: state.screen,
    sheetOpen: state.sheetOpen,
    interventionShown: state.interventionShown
  });
  if (autoStarted) {
    log('prototype_session_start', 'system', { recordType: state.recordType, auto: true, trigger: 'first_open' });
    log('goal_screen_shown', 'system', { trigger: 'first_open' });
  }

  if (viewMode === 'researcher') {
    var s = document.createElement('script');
    s.src = 'researcher.js';
    document.body.appendChild(s);
  }
})();
