# 퇴근길 목표 — Lo-fi working prototype (Claude 버전)

연구용 PoC입니다. 외부 OTT·SNS 연동, 앱 실행 감지, 위치·환승·하차 감지는 **없고 모두 시뮬레이션**입니다.

## 실행

`index.html`을 브라우저로 열면 됩니다(서버 불필요). 데이터는 해당 브라우저의 localStorage에만 저장되며 외부로 전송되지 않습니다.

| 모드 | 주소 | 보이는 것 |
|---|---|---|
| 기본(혼자 체험) | `index.html` | 모바일 프레임 + 프레임 바깥의 `PROTOTYPE TEST` 패널. 처음 열면 바로 목표 화면. 상태값·로그·단계 이동·단축키 없음 |
| 연구자 | `index.html?mode=researcher` | 프레임 + TEST CONTROLLER |

- 모드는 이 두 가지뿐입니다. 프레임 안에는 모드 전환 버튼이나 테스트 버튼, 개발용 설명이 없습니다. 모드는 주소로만 구분합니다.
- 같은 브라우저에서 참가자 창과 연구자 창을 각각 열면 진행 상태와 로그가 실시간으로 동기화됩니다(localStorage 이벤트).
  다른 기기 사이에서는 동기화되지 않습니다(서버 없음).
- 연구자 모드는 연구자 본인이 쓰는 모드입니다. 참가자에게 이 주소를 알려주지 마세요.

## 처음 열었을 때

저장된 진행 상태가 없으면 빈 화면 없이 바로 `오늘 퇴근길 목표` 화면이 열리고 세션이 자동 생성됩니다(`prototype_session_start`, `auto: true`). 참가자 URL은 `실험 기록`, 연구자 모드는 `테스트 기록`으로 시작합니다. 같은 브라우저에서 다시 열면 진행 상태가 복원됩니다.

## 기본 URL: 링크 하나로 01→05 혼자 체험

웹 프로토타입은 실제 앱 전환과 하차를 감지할 수 없으므로, 프레임 **바깥**의 `PROTOTYPE TEST` 패널이 그 상황을 대신 발생시킵니다. 패널에는 현재 상황과 "왜 눌러야 하는지" 설명이 표시됩니다. 모바일 폭에서도 프레임은 그대로(전체 화면)이고, 패널은 프레임 아래에 놓이며 페이지가 세로로 스크롤됩니다.

| 단계 | 프레임 안(참가자) | PROTOTYPE TEST 패널 |
|---|---|---|
| 01 목표 확인 | [해리포터 시작] | 버튼 없음(상황 표시만) |
| 02 OTT(개입 전) | 정적 화면. 타임라인을 눌러도 개입 없음 | **[이탈 앱 열기]** |
| 03 이탈 앱(첫 진입) | 04 개입 시트가 자동으로 열림 | 버튼 없음("시트에서 선택") |
| 04 목표 리마인드 | [해리포터로] → 02 복귀 / [피드 계속 보기] → 03 유지 | 버튼 없음 |
| 02·03(개입 경험 후) | 03에서는 `←`로 02 복귀 | **[하차 상황]**(02에서는 [이탈 앱 열기]도 표시. 재이탈은 개입 없음) |
| 05 회고 | 점수 선택 후 [완료] | 버튼 없음 |
| 05 완료 후 | 완료 문구 + [처음으로 돌아가기] | **[처음부터 다시 체험]** |

- 개입을 한 번도 경험하지 않았거나 시트가 열려 있는 동안에는 [하차 상황]이 나타나지 않고, 앱 쪽에서도 막혀 있습니다.
- 로그: 패널 조작은 `source: prototype_test`, `simulated: true`, 참가자 화면 안 클릭은 `source: participant`입니다. 세션 유형은 기본 URL에서 `study`입니다(참가자 로그는 각자 브라우저의 localStorage에만 저장되며 서버로 모이지 않습니다).
- 패널은 연구자 모드에서는 표시되지 않습니다.

## 참가자 화면 내비게이션

연구자 컨트롤러와 별개로 동작하며 참가자 이벤트(`source: participant`)로 기록됩니다.

| 현재 | 조작 | 결과 |
|---|---|---|
| 02 OTT | 상단 왼쪽 `←` | 01 목표 확인 (`participant_back`) |
| 03 이탈 피드 | 상단 왼쪽 `←` | 02 OTT (`participant_back`) |
| 03 + 개입 시트 | — | `←` 불가(배경 비활성). 시트 두 버튼 선택이 우선 |
| 05 회고(미완료) | — | 점수 선택 후 [완료]만 가능 |
| 05 회고(완료) | `처음으로 돌아가기` | 새 세션으로 01 목표 확인. 기존 세션의 점수·제출은 보존 |

- 뒤로 가도 이동당 개입 1회 기록(`interventionShown`)은 되돌아가지 않습니다.
- 뒤로 간 뒤 다시 [해리포터 시작]을 누르면 `goal_start_clicked`의 `attempt`가 2, 3… 으로 늘어납니다(첫 클릭과 구분).
- 완료 후 같은 버튼이 `처음으로 돌아가기`가 되고 "완료했어요. 응답이 저장되었어요." 문구가 나타납니다. 점수와 제출은 잠긴 채이며, 완료 직후 0.7초는 연타로 넘어가지 않도록 무시합니다.
- 재시작하면 기존 세션에 `participant_restart`(participant), 새 세션에 `prototype_session_start`·`goal_screen_shown`(system, `trigger: participant_restart`)이 남고 기록 유형은 이전 세션과 같습니다.
- 실제 참가자 기록과 테스트 이동의 구분: `sessionType`(test/study)과 `source`(participant=참가자 조작, researcher=연구자 패널 이동)로 구분합니다.

## TEST CONTROLLER (연구자 모드, 폭 260px, 760px 미만에서는 숨김)

실제 서비스 UI가 아닌 테스트용 패널입니다. 모바일 프레임 오른쪽 바깥에만 표시됩니다.

- **단계 5개**: `01 목표 확인 · 02 OTT · 03 이탈 앱 · 04 목표 리마인드 · 05 하차 후 회고`. 현재 단계가 강조되며 클릭하면 바로 이동합니다. `04`는 독립 화면이 아니라 `03` 위에 bottom sheet가 열린 상태입니다.
- **← 이전 / 다음 →**: 위 순서를 따라 이동합니다. 단축키 `Alt+Shift+←/→`도 같은 동작입니다(일반 화살표는 회고 점수 조작과 충돌하지 않도록 사용하지 않음).
- **처음으로**: 언제든 사용할 수 있습니다. 항상 새 **테스트 세션**을 만들고(`newTrip`) 개입 노출·회고 점수·완료 상태를 초기화한 뒤 `01 목표 확인`으로 이동합니다. 현재가 실험 기록 세션이면 확인창 후 테스트 세션으로 전환합니다.
- **상황 시뮬레이션**: `이탈 상황 발생`(OTT에서만, 이동에서 처음이면 실제 규칙대로 개입), `하차 상황 발생`(OTT·피드 어디서든 회고로). 개입 응답 전 하차는 사유와 함께 `intervention_aborted_by_researcher`로 따로 기록됩니다. `개입 노출: 0 / 1` 표시.
- 연구자 화면을 처음 열면 기록 유형은 항상 **테스트 기록**입니다. 패널에는 기록 유형 토글이 없고, 실험 기록은 참가자 URL로 처음 열린 세션에서만 생깁니다.

### 단계 이동 규칙

- 단계 이동(클릭·이전·다음·단축키)은 **테스트 기록 세션에서만** 동작합니다. 실험 기록(실제 참가자) 세션에서는 비활성이며, 패널에 "빠른 이동은 테스트 기록에서만 사용할 수 있습니다."라고 표시됩니다. 이탈·하차 시뮬레이션과 `처음으로`는 사용할 수 있습니다.
- **04 진입은 미리보기**입니다: `researcher_nav`(`preview: true`)만 기록하고 `interventionShown`을 바꾸지 않으며 `intervention_shown`도 기록하지 않습니다. 개입은 `이탈 상황 발생`으로 처음 열렸을 때만 집계됩니다.
- 미리보기 중 시트의 버튼은 `intervention_preview_closed`(source: researcher)로 기록되며 참가자 선택(`intervention_return_clicked` 등)을 만들지 않습니다.
- 실제 개입(응답 대기 중)을 단계 이동으로 떠나면 `intervention_aborted_by_researcher`(`reason: researcher_nav`)로 기록합니다.
- 05(회고)에서 다른 단계로 가면 점수·완료 상태가 초기화됩니다(테스트 세션 한정). 참가자 화면의 제출 후 잠금은 그대로입니다.
- 모든 단계 이동은 `researcher_nav`(`from`, `to`, `method: step|prev|next|home`, `preview`)와 `screen_changed`(source: researcher)로 남고 참가자 이벤트(`goal_start_clicked` 등)는 만들지 않습니다.

## 통제된 세션 절차 (선택)

목표 화면 제시 시각을 정확히 기록하고 싶을 때: `처음으로`를 누르면 `task_started` / `goal_screen_shown`이 그 시점으로 기록됩니다. 이후 참가자가 [해리포터 시작]을 누르고, 연구자가 `이탈 상황 발생`, `하차 상황 발생`으로 진행하며, 참가자가 점수 선택 후 [완료]합니다(제출 후 점수와 제출 잠금, 새로고침해도 유지).

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
| `prototype_session_start`(via `prototype_test_restart`) | prototype_test | 패널의 [처음부터 다시 체험]으로 새 세션 시작 |
| `participant_back` | participant | 참가자 뒤로가기(`from`, `to`) |
| `participant_restart` | participant | 완료 후 처음으로 돌아가기(`fromSession`) |
| `researcher_nav` | researcher | 단계 이동(`from`/`to`/`method`/`preview`). 04 진입은 `preview: true` |
| `intervention_preview_closed` | researcher | 04 미리보기 시트를 버튼으로 닫음(참가자 선택 아님) |
| `log_exported` / `log_cleared` | researcher | 로그 내보내기 / 전체 삭제 |

## 시뮬레이션 범위와 한계

- **OTT 화면**: 정적 와이어프레임입니다. 재생·재생 위치·연동 없음. 장식 요소는 조작되지 않습니다.
- **이탈 피드**: 회색 플레이스홀더를 내부 스크롤만 합니다. 실제 이미지·무한 피드·좋아요/댓글 없음.
- **이탈·하차**: 실제 앱 실행, Screen Time, 위치, 환승, 하차는 감지하지 않고 연구자 조작으로만 발생합니다.
- **[다른 활동]**: 이번 PoC 범위 밖이라 비활성 상태로만 표시합니다.
- 이 로그로 *실제* SNS 이탈 감소나 실제 시청 시간을 계산하지 않습니다. 이번 버전은 목표 이해, 시작 버튼까지의 시간, 개입 후 선택, 회고 응답만 봅니다.
- 작은 화면(폭 430px 이하)에서는 실제 기기의 상태바와 겹치지 않도록 모의 상태바·홈바를 숨깁니다.
