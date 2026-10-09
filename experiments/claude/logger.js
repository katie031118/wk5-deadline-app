/* 연구용 로거 + 진행 상태 저장소 — localStorage 전용, 외부 전송 없음
 *
 * 로그 저장 형식: ts = ISO 8601 UTC(끝이 Z). 표시용 시간대 변환은 formatLocal()이 담당한다.
 * 기존(v1) 로그 { event, ts, sessionId }는 그대로 보존하고, v2부터 필드를 추가한다.
 */
(function () {
  var LOG_KEY = 'wk5_prototype_log';           // 기존 키 유지(누적 보존)
  var STATE_KEY = 'wk5_prototype_state';       // 진행 중인 이동 상태(새로고침 복원용)
  var SEQ_KEY = 'wk5_prototype_session_seq';   // 기존 키 유지
  var PREF_KEY = 'wk5_researcher_pref';        // 연구자 패널 설정
  var SCHEMA = 2;

  var memory = {}; // localStorage 불가 시 폴백

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? (key in memory ? memory[key] : null) : raw;
    } catch (e) {
      return key in memory ? memory[key] : null;
    }
  }
  function write(key, value) {
    memory[key] = value;
    try { localStorage.setItem(key, value); } catch (e) { /* 메모리만 사용 */ }
  }
  function readJSON(key, fallback) {
    var raw = read(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  var listeners = [];
  function notify() {
    var list = Logger.all();
    listeners.forEach(function (fn) { fn(list); });
  }

  // 다른 탭(참가자 창 ↔ 연구자 창)에서 쓴 로그도 반영
  window.addEventListener('storage', function (e) {
    if (e.key === LOG_KEY) notify();
  });

  function pad(n, len) {
    var s = String(n);
    while (s.length < (len || 2)) s = '0' + s;
    return s;
  }

  var Logger = {
    SCHEMA: SCHEMA,

    nextSessionId: function () {
      var n = parseInt(read(SEQ_KEY), 10) || 0;
      n += 1;
      write(SEQ_KEY, String(n));
      return 's' + n;
    },

    /* ctx: { sessionId, sessionType('test'|'study'|null), source('participant'|'researcher'|'system'), viewMode } */
    log: function (event, ctx, extra) {
      ctx = ctx || {};
      var entry = {
        event: event,
        ts: new Date().toISOString(),
        sessionId: ctx.sessionId || null,
        sessionType: ctx.sessionType || null,
        source: ctx.source || 'system',
        viewMode: ctx.viewMode || null,
        schemaVersion: SCHEMA
      };
      if (extra) {
        Object.keys(extra).forEach(function (k) {
          if (!(k in entry)) entry[k] = extra[k];
        });
      }
      var list = readJSON(LOG_KEY, []);
      list.push(entry);
      write(LOG_KEY, JSON.stringify(list));
      notify();
      return entry;
    },

    all: function () { return readJSON(LOG_KEY, []); },

    /* 전체 삭제 — 호출 전 확인 절차는 UI에서 담당 */
    clear: function () {
      write(LOG_KEY, JSON.stringify([]));
      notify();
    },

    onChange: function (fn) { listeners.push(fn); },

    /* 표시용 로컬 시각 (저장값은 UTC 그대로) */
    formatLocal: function (iso) {
      var d = new Date(iso);
      if (isNaN(d)) return String(iso);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + pad(d.getMilliseconds(), 3);
    },
    tzInfo: function () {
      var off = -new Date().getTimezoneOffset();
      var sign = off >= 0 ? '+' : '-';
      var abs = Math.abs(off);
      var name = '';
      try { name = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      return { name: name, offset: 'UTC' + sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60) };
    },

    buildExport: function () {
      var tz = Logger.tzInfo();
      var events = Logger.all();
      return {
        meta: {
          exportedAt: new Date().toISOString(),
          timestampFormat: 'ISO 8601, UTC (Z)',
          displayTimeZone: tz.name + ' (' + tz.offset + ')',
          schemaVersion: SCHEMA,
          eventCount: events.length,
          notes: [
            'source: participant=화면 안 조작, researcher=연구자 패널/단축키 조작, system=규칙에 따른 화면 표시',
            'simulated=true 이벤트는 연구자가 발생시킨 시뮬레이션이며 실제 앱·하차 감지가 아님',
            'goal_start_clicked는 프로토타입 버튼 클릭이며 실제 시청 시작이 아님',
            'sessionType: test=테스트 기록, study=실험 기록. schemaVersion 없는 항목은 v1(구버전) 기록'
          ]
        },
        events: events
      };
    },

    /* JSON 파일로 내보내기 (브라우저 다운로드) */
    exportJSON: function () {
      var data = Logger.buildExport();
      var stamp = data.meta.exportedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'wk5-prototype-log-' + stamp + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return data;
    }
  };

  /* ---------- 진행 상태 저장소 ---------- */
  window.Store = {
    KEY: STATE_KEY,
    get: function () {
      var s = readJSON(STATE_KEY, null);
      return s && s.v === 2 ? s : null;
    },
    set: function (state) { write(STATE_KEY, JSON.stringify(state)); },
    getPref: function () { return readJSON(PREF_KEY, {}); },
    setPref: function (pref) { write(PREF_KEY, JSON.stringify(pref)); }
  };

  window.Logger = Logger;
})();
