README
연구자 되돌리기: 피드→OTT(재이탈 시험용), 회고(미제출)→하차 직전 화면. 개입 횟수는 되돌리지 않으며 researcher_back으로 기록됩니다.
단축키(연구자 모드 전용, 일반 화살표와 충돌 방지): Alt+Shift+→ 다음 진행(과제 시작·이탈·하차, 개입 중에는 무시), Alt+Shift+← 되돌리기.
로그
저장 키: wk5_prototype_log(누적 보존, 기존 키 유지). 시각 ts는 **UTC ISO 8601(Z)**로 저장하고, 연구자 패널에는 로컬 시간대로 변환해 표시합니다(원본 UTC는 마우스 오버).
모든 이벤트: event, ts, sessionId, sessionType(test|study), source(participant|researcher|system), viewMode, schemaVersion.
source: participant=프레임 안 조작, researcher=패널·단축키, system=규칙에 따른 화면 표시.
simulated: true = 연구자가 발생시킨 시뮬레이션(실제 앱·하차 감지가 아님). goal_start_clicked는 버튼 클릭이며 실제 시청 시작이 아닙니다.
새로고침만으로는 진행 중 세션이 초기화되지 않으며, page_loaded에 restored 여부가 남습니다.
JSON 내보내기: 전체 로그를 meta(내보낸 시각, 시간대 등) + events로 저장합니다. 로그 전체 삭제는 확인 절차 후 실행되며 log_cleared가 남습니다. 삭제 전 내보내기를 권장합니다.
구버전(v1) 로그(event, ts, sessionId만 있음)는 그대로 보존됩니다.
이벤트
source
의미
page_loaded
system
페이지 로딩(과제 시작과 별개)
prototype_session_start
researcher
새 이동(세션) 시작
task_started
researcher
연구자가 과제 시작
goal_screen_shown
system
목표 화면 노출
goal_start_clicked
participant
[해리포터 시작] 클릭
screen_changed
변경 주체
from/to/via
drift_app_entered
researcher
이탈 앱 진입 시뮬레이션 (interventionShownBefore)
intervention_shown
system
이탈 개입 표시 (이동당 최대 1회)
intervention_return_clicked / intervention_continue_clicked
participant
개입 응답
intervention_aborted_by_researcher
researcher
응답 전 연구자 종료(reason), 참가자 선택 아님
trip_exit_triggered
researcher
하차 시뮬레이션
reflection_shown
system
회고 화면 노출
reflection_rating_selected
participant
점수 선택(rating, previousRating)
reflection_completed
participant
제출
researcher_back
researcher
연구자 되돌리기
log_exported / log_cleared
researcher
로그 내보내기 / 전체 삭제
시뮬레이션 범위와 한계
OTT 화면: 정적 와이어프레임입니다. 재생·재생 위치·연동 없음. 장식 요소는 조작되지 않습니다.
이탈 피드: 회색 플레이스홀더를 내부 스크롤만 합니다. 실제 이미지·무한 피드·좋아요/댓글 없음.
이탈·하차: 실제 앱 실행, Screen Time, 위치, 환승, 하차는 감지하지 않고 연구자 조작으로만 발생합니다.
[다른 활동]: 이번 PoC 범위 밖이라 비활성 상태로만 표시합니다.
이 로그로 실제 SNS 이탈 감소나 실제 시청 시간을 계산하지 않습니다. 이번 버전은 목표 이해, 시작 버튼까지의 시간, 개입 후 선택, 회고 응답만 봅니다.
작은 화면(폭 430px 이하)에서는 실제 기기의 상태바와 겹치지 않도록 모의 상태바·홈바를 숨깁니다.
