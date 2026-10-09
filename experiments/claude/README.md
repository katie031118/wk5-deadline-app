# 퇴근길 목표 — Lo-fi working prototype (Claude 버전)

연구용 PoC입니다. 외부 OTT·SNS 연동, 앱 실행 감지, 위치·환승·하차 감지는 **없고 모두 시뮬레이션**입니다.

## 실행

`index.html`을 브라우저로 열면 됩니다(서버 불필요). 데이터는 해당 브라우저의 localStorage에만 저장되며 외부로 전송되지 않습니다.

| 모드 | 주소 | 보이는 것 |
|---|---|---|
| 참가자 | `index.html` | 모바일 프레임만. 처음 열면 바로 목표 화면. 컨트롤러·상태값·로그·단축키 없음 |
| 연구자 | `index.html?mode=researcher` | 프레임 + 연구자 컨트롤러(TEST ONLY) |

- 참가자 화면 안에는 모드 전환 버튼이나 개발용 설명이 없습니다. 모드는 주소로만 구분합니다.
- 같은 브라우저에서 참가자 창과 연구자 창을 각각 열면 진행 상태와 로그가 실시간으로 동기화됩니다(localStorage 이벤트).
  다른 기기 사이에서는 동기화되지 않습니다(서버 없음).
- 연구자 모드는 연구자 본인이 쓰는 모드입니다. 참가자에게 이 주소를 알려주지 마세요.

## 처음 열었을 때

저장된 진행 상태가 없으면 빈 화면 없이 바로 `오늘 퇴근길 목표` 화면이 열리고 세션이 자동 생성됩니다(`prototype_session_start`, `auto: true`). 참가자 URL은 `실험 기록`, 연구자 모드는 `테스트 기록`으로 시작합니다. 같은 브라우저에서 다시 열면 진행 상태가 복원됩니다.

## 진행 순서 (연구자, 통제된 세션)

아래 순서는 목표 화면 제시 시각을 정확히 기록하고 싶을 때 쓰는 선택 절차입니다.

1. **기록 유형 선택** — `테스트 기록`(기본) / `실험 기록(실제 참가자)`. 이 선택이 이동(세션) 전체에 붙습니다.
2. **새 이동 시작** — 새 세션 ID를 만들고 개입 횟수·회고 상태를 초기화합니다. 참가자 화면은 비어 있습니다(대기).
3. 참가자에게 설명을 마친 뒤 **과제 시작 · 목표 화면 제시** — 이 시점이 `task_started` / `goal_screen_shown`입니다.
   (페이지 로딩 `page_loaded`, 진행자 설명 시간과 구분하기 위함)
4. 참가자가 [해리포터 시작]을 누르면 OTT 화면으로 이동합니다.
5. **이탈 상황 발생** — 이동에서 처음이면 개입, 이후는 피드만 표시됩니다.
6. **하차 상황 발생** — OTT/피드 어디서든 회고로 이동합니다.
   개입 응답 전에 실행하면 참가자의 선택으로 기록하지 않고 `intervention_aborted_by_researcher`(사유 포함)로 별도 기록합니다.
7. 참가자가 점수 선택 후 [완료] — 제출 후 점수와 제출이 잠깁니다. 새로고침해도 유지됩니다.

`연구자 되돌리기`: 피드→OTT(재이탈 시험용), 회고(미제출)→하차 직전 화면. 개입 횟수는 되돌리지 않으며 `researcher_back`으로 기록됩니다.

단축키(연구자 모드 전용, 일반 화살표와 충돌 방지): `Alt+Shift+→` 다음 진행(과제 시작·이탈·하차, 개입 중에는 무시), `Alt+Shift+←` 되돌리기.

## 로그

- 저장 키: `wk5_prototype_log`(누적 보존, 기존 키 유지). 시각 `ts`는 **UTC ISO 8601(Z)**로 저장하고, 연구자 패널에는 **로컬 시간대**로 변환해 표시합니다(원본 UTC는 마우스 오버).
- 모든 이벤트: `event, ts, sessionId, sessionType(test|study), source(participant|researcher|system), viewMode, schemaVersion`.
- `source`: `participant`=프레임 안 조작, `researcher`=패널·단축키, `system`=규칙에 따른 화면 표시.
- `simulated: true` = 연구자가 발생시킨 시뮬레이션(실제 앱·하차 감지가 아님). `goal_start_clicked`는 버튼 클릭이며 실제 시청 시작이 아닙니다.
- 새로고침만으로는 진행 중 세션이 초기화되지 않으며, `page_loaded`에 `restored` 여부가 남습니다.
- **JSON 내보내기**: 전체 로그를 `meta`(내보낸 시각, 시간대 등) + `events`로 저장합니다. **로그 전체 삭제**는 확인 절차 후 실행되며 `log_cleared`가 남습니다. 삭제 전 내보내기를 권장합니다.
- 구버전(v1) 로그(`event, ts, sessionId`만 있음)는 그대로 보존됩니다.

| 이벤트 | source | 의미 |
|---|---|---|
| `page_loaded` | system | 페이지 로딩(과제 시작과 별개) |
| `prototype_session_start` | researcher | 새 이동(세션) 시작 |
| `task_started` | researcher | 연구자가 과제 시작 |
| `goal_screen_shown` | system | 목표 화면 노출 |
| `goal_start_clicked` | participant | [해리포터 시작] 클릭 |
| `screen_changed` | 변경 주체 | `from`/`to`/`via` |
| `drift_app_entered` | researcher | 이탈 앱 진입 시뮬레이션 (`interventionShownBefore`) |
| `intervention_shown` | system | 이탈 개입 표시 (이동당 최대 1회) |
| `intervention_return_clicked` / `intervention_continue_clicked` | participant | 개입 응답 |
| `intervention_aborted_by_researcher` | researcher | 응답 전 연구자 종료(`reason`), 참가자 선택 아님 |
| `trip_exit_triggered` | researcher | 하차 시뮬레이션 |
| `reflection_shown` | system | 회고 화면 노출 |
| `reflection_rating_selected` | participant | 점수 선택(`rating`, `previousRating`) |
| `reflection_completed` | participant | 제출 |
| `researcher_back` | researcher | 연구자 되돌리기 |
| `log_exported` / `log_cleared` | researcher | 로그 내보내기 / 전체 삭제 |

## 시뮬레이션 범위와 한계

- **OTT 화면**: 정적 와이어프레임입니다. 재생·재생 위치·연동 없음. 장식 요소는 조작되지 않습니다.
- **이탈 피드**: 회색 플레이스홀더를 내부 스크롤만 합니다. 실제 이미지·무한 피드·좋아요/댓글 없음.
- **이탈·하차**: 실제 앱 실행, Screen Time, 위치, 환승, 하차는 감지하지 않고 연구자 조작으로만 발생합니다.
- **[다른 활동]**: 이번 PoC 범위 밖이라 비활성 상태로만 표시합니다.
- 이 로그로 *실제* SNS 이탈 감소나 실제 시청 시간을 계산하지 않습니다. 이번 버전은 목표 이해, 시작 버튼까지의 시간, 개입 후 선택, 회고 응답만 봅니다.
- 작은 화면(폭 430px 이하)에서는 실제 기기의 상태바와 겹치지 않도록 모의 상태바·홈바를 숨깁니다.
