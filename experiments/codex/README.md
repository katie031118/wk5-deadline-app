# 퇴근길 UX research prototype

A static, Korean-language, grayscale working prototype matching the five supplied lo-fi references. All implementation files are in this folder. No build step, dependencies, backend, or real app integrations.

## Run

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Serve these files unchanged from GitHub Pages (either at the site root or in a subdirectory); all file URLs are relative. No deployment has been performed.

## Research procedure

1. Select **처음으로** for each participant/session. Prior local events are retained.
2. The participant selects **해리포터 시작**. The simulated player starts in one tap. Its play/pause button changes the simulated state only.
3. Select **이탈 상황 발생** outside the phone. The feed opens with the goal reminder once. **해리포터로** returns to OTT; **계속 보기** stays in the feed. Further drift triggers open the feed without reminders.
4. Select **하차 상황 발생**. The participant chooses a rating and selects **완료**. Responses cannot be submitted twice.

The drift and end controls become available after starting the activity. Ending the commute can also dismiss an open reminder and go directly to reflection. Escape on the reminder is equivalent to **계속 보기**. Other activity selection is outside this fixed scenario; **다른 활동** gives an inline explanation. Peripheral placeholder icons are decorative.

At a 390 × 844 browser viewport, the product occupies the first 844 pixels; researcher tools are below it. Using a researcher trigger brings the phone back into view without animation. On wide desktop viewports the 390 × 844 phone is centered, with tools to its right. Feed scrolling happens inside the phone. Explanatory captions in the source images are represented in the researcher notes, not the product.

## Local data

Storage key: `commute-research-prototype-v1`.

The JSON value contains `version`, the current `session`, and an `events` array. Each event includes `name`, ISO UTC `timestamp`, and `sessionId`. Rating events also contain numeric `rating`. Researcher log times are displayed in Asia/Seoul. The visible log shows only the current session; previous sessions remain in localStorage.

Events: `prototype_session_start`, `goal_start_clicked`, `drift_app_entered`, `intervention_shown`, `intervention_return_clicked`, `intervention_continue_clicked`, `reflection_rating_selected`, `reflection_completed`.

Reloading resumes the current session, including a pending reminder or saved response. The intervention allowance resets only with **처음으로**. A reload of an open reminder restores that same pending choice without recording another appearance. If storage is unavailable, the prototype still runs in memory and displays a researcher-only warning; persistence then cannot be guaranteed. Use one tab per research session. Browser storage is local to the origin and browser, not synchronized.

## Simulation boundaries

No actual video, copyrighted imagery, branded social interface, notification, messenger interception, app blocking, location or transit detection, playback-position access, fatigue recommendations, or automated watch/read-time analytics. The fixed player progress bar is a visual placeholder. There is no timer that triggers a reminder. Only the researcher drift trigger can do so.

## Verification

See `verification/RESULTS.md` for browser checks and `verification/verify.cjs` for the repeatable acceptance test. Test tooling is separate from the static app; it uses an externally available Playwright installation and Chrome and is not required to run or deploy the prototype.
