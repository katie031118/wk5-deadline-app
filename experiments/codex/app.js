(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const store = window.ResearchStore;
  const data = store.load();
  const screenNames = { goal: '목표 확인', ott: '외부 OTT 앱', feed: '등록한 이탈 앱', reflection: '이동시간 돌아보기' };
  const ratings = [...document.querySelectorAll('input[name="rating"]')];
  const log = (name, details) => store.record(data, name, details);
  let lastScreen = null;
  let lastSheetOpen = false;

  function revealProduct() {
    // Research controls sit below the phone on smaller screens.
    if (window.matchMedia('(max-width: 1050px)').matches) $('phone').scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  for (let i = 0; i < 3; i++) $('feed-posts').append($('feed-post-template').content.cloneNode(true));

  function newSession() {
    data.session = {
      id: globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      screen: 'goal', started: false, interventionUsed: false, interventionOpen: false,
      rating: null, completed: false, playing: false,
    };
    $('activity-notice').textContent = '';
    $('feed-posts').scrollTop = 0;
    log('prototype_session_start');
    render();
  }

  function renderLog() {
    const events = data.events.filter(event => event.sessionId === data.session.id);
    $('event-count').textContent = events.length;
    $('event-list').replaceChildren();
    for (const event of events.slice().reverse()) {
      const item = document.createElement('li');
      const time = document.createElement('time');
      time.dateTime = event.timestamp;
      time.textContent = new Date(event.timestamp).toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' });
      const name = document.createElement('code');
      name.textContent = event.name + (event.rating ? ` · ${event.rating}` : '');
      item.append(time, name);
      $('event-list').append(item);
    }
    $('storage-notice').hidden = store.available;
  }

  function render() {
    const s = data.session;
    for (const name of Object.keys(screenNames)) $(`${name}-screen`).hidden = s.screen !== name;
    $('intervention-layer').hidden = !s.interventionOpen;
    $('screens').inert = s.interventionOpen;
    $('play-symbol').setAttribute('href', s.playing ? '#icon-pause' : '#icon-play');
    $('toggle-play').setAttribute('aria-pressed', String(s.playing));
    $('toggle-play').setAttribute('aria-label', s.playing ? '모의 재생 일시정지' : '모의 재생 시작');
    for (const radio of ratings) { radio.checked = Number(radio.value) === s.rating; radio.disabled = s.completed; }
    $('complete-reflection').disabled = s.rating === null || s.completed;
    $('complete-reflection').textContent = s.completed ? '완료됨' : '완료';
    $('completion-notice').textContent = s.completed ? '응답이 저장되었어요.' : '';
    $('trigger-drift').disabled = !s.started || s.screen === 'reflection' || s.interventionOpen;
    $('end-commute').disabled = !s.started || s.screen === 'reflection';
    $('research-state').textContent = `${screenNames[s.screen]}${s.interventionOpen ? ' · 목표 알림 표시 중' : ''} · 개입 ${s.interventionUsed ? '1' : '0'}/1회${s.completed ? ' · 응답 완료' : ''}`;
    renderLog();
    if (s.interventionOpen && !lastSheetOpen) $('intervention').focus({ preventScroll: true });
    else if (!s.interventionOpen && (s.screen !== lastScreen || lastSheetOpen)) $(`${s.screen}-title`).focus({ preventScroll: true });
    lastScreen = s.screen;
    lastSheetOpen = s.interventionOpen;
  }

  $('start-goal').addEventListener('click', () => {
    if (data.session.screen !== 'goal') return;
    Object.assign(data.session, { screen: 'ott', started: true, playing: true });
    log('goal_start_clicked');
    render();
  });
  $('other-activity').addEventListener('click', () => {
    $('activity-notice').textContent = '이 테스트에서는 활동 변경을 제공하지 않아요.';
  });
  $('toggle-play').addEventListener('click', () => {
    data.session.playing = !data.session.playing;
    store.save(data);
    render();
  });
  $('trigger-drift').addEventListener('click', () => {
    const s = data.session;
    if (!s.started || s.screen === 'reflection' || s.interventionOpen) return;
    s.screen = 'feed';
    s.playing = false;
    $('feed-posts').scrollTop = 0;
    log('drift_app_entered');
    if (!s.interventionUsed) {
      s.interventionUsed = true;
      s.interventionOpen = true;
      log('intervention_shown');
    }
    render();
    revealProduct();
  });
  function resolveIntervention(returnToGoal) {
    if (!data.session.interventionOpen) return;
    Object.assign(data.session, { interventionOpen: false, screen: returnToGoal ? 'ott' : 'feed', playing: returnToGoal });
    log(returnToGoal ? 'intervention_return_clicked' : 'intervention_continue_clicked');
    render();
  }
  $('return-goal').addEventListener('click', () => resolveIntervention(true));
  $('continue-feed').addEventListener('click', () => resolveIntervention(false));
  $('intervention').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); resolveIntervention(false); }
    if (event.key !== 'Tab') return;
    const first = $('return-goal');
    const last = $('continue-feed');
    if (event.shiftKey && (document.activeElement === first || document.activeElement === $('intervention'))) {
      event.preventDefault(); last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus({ preventScroll: true });
    }
  });
  $('end-commute').addEventListener('click', () => {
    if (!data.session.started || data.session.screen === 'reflection') return;
    Object.assign(data.session, { screen: 'reflection', interventionOpen: false, playing: false });
    store.save(data);
    render();
    revealProduct();
  });
  for (const radio of ratings) radio.addEventListener('change', () => {
    if (data.session.completed || data.session.screen !== 'reflection') return;
    data.session.rating = Number(radio.value);
    log('reflection_rating_selected', { rating: data.session.rating });
    render();
  });
  $('complete-reflection').addEventListener('click', () => {
    const s = data.session;
    if (s.screen !== 'reflection' || s.rating === null || s.completed) return;
    s.completed = true;
    log('reflection_completed', { rating: s.rating });
    render();
  });
  $('reset-session').addEventListener('click', () => { newSession(); revealProduct(); });
  if (data.session) render(); else newSession();
})();
