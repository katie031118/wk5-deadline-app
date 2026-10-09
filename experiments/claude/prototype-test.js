/* PROTOTYPE TEST 패널 — 기본 URL(참가자 테스트 모드)에서 모바일 프레임 바깥에 표시된다.
 * 실제 서비스 기능이 아니라, 웹 PoC가 감지할 수 없는 "이탈 앱 열기"와 "하차"를 대신 발생시키는 장치다.
 * 프레임 안에는 테스트 버튼을 넣지 않는다. 연구자 모드(?mode=researcher)에서는 로드되지 않는다.
 * 패널 조작은 source:'prototype_test', simulated:true 로 기록된다(app.js).
 */
(function () {
  'use strict';
  var P = window.Proto;
  if (!P || P.viewMode !== 'participant') return;

  var panel = document.createElement('aside');
  panel.className = 'controller ptest';
  panel.id = 'prototype-test';
  panel.setAttribute('aria-label', '프로토타입 테스트 조작');
  panel.innerHTML =
    '<span class="badge">PROTOTYPE TEST</span>' +
    '<p class="note">실제 앱 전환과 하차 감지를 대신하는 테스트 조작입니다. 실제 앱 전환·하차를 감지할 수 없는 웹 프로토타입이라 테스트 상황을 직접 발생시킵니다.</p>' +
    '<p class="pt-situation" id="pt-situation" role="status"></p>' +
    '<p class="note pt-hint" id="pt-hint"></p>' +
    '<button type="button" id="pt-drift">이탈 앱 열기</button>' +
    '<button type="button" id="pt-exit">하차 상황</button>' +
    '<button type="button" id="pt-restart">처음부터 다시 체험</button>';
  document.getElementById('stage').appendChild(panel);

  function $(id) { return document.getElementById(id); }

  function render(st) {
    var sit, hint = '';
    var driftBtn = false, exitBtn = false, restartBtn = false;

    if (st.screen === 'goal') {
      sit = '목표 확인';
      hint = '화면에서 [해리포터 시작]을 눌러 주세요.';
    } else if (st.screen === 'ott') {
      sit = 'OTT 시청 중';
      hint = st.interventionShown
        ? 'OTT 시청 중에는 서비스가 개입하지 않습니다. 이탈 앱을 다시 열어도 이번 이동에서는 개입하지 않습니다(이동당 1회).'
        : 'OTT 시청 중에는 서비스가 개입하지 않습니다. 이탈 앱을 열어 이탈 상황을 만들어 보세요.';
      driftBtn = true;
      exitBtn = st.interventionShown;
    } else if (st.screen === 'feed') {
      if (st.sheetOpen) {
        sit = '목표 리마인드';
        hint = '화면 아래 시트에서 [해리포터로] 또는 [피드 계속 보기]를 선택해 주세요.';
      } else {
        sit = '이탈 앱 사용 중';
        hint = st.interventionShown
          ? '이동을 마친 상황을 만들려면 [하차 상황]을 눌러 주세요.'
          : '';
        exitBtn = st.interventionShown;
      }
    } else if (st.screen === 'reflection') {
      if (st.completed) {
        sit = '회고 완료';
        hint = '처음부터 다시 체험할 수 있습니다.';
        restartBtn = true;
      } else {
        sit = '하차 후 회고';
        hint = '점수를 선택하고 [완료]를 눌러 주세요.';
      }
    } else {
      sit = '대기';
    }

    $('pt-situation').textContent = '현재 상황 · ' + sit;
    $('pt-hint').textContent = hint;
    $('pt-hint').hidden = !hint;
    $('pt-drift').hidden = !driftBtn;
    $('pt-exit').hidden = !exitBtn;
    $('pt-restart').hidden = !restartBtn;
  }

  $('pt-drift').addEventListener('click', function () { P.actions.drift('prototype_test'); });
  $('pt-exit').addEventListener('click', function () { P.actions.exit('prototype_test_exit', 'prototype_test'); });
  $('pt-restart').addEventListener('click', function () {
    var st = P.getState();
    P.actions.newTrip(st.recordType, { toGoal: true, source: 'prototype_test' });
  });

  P.onRender(render);
})();
