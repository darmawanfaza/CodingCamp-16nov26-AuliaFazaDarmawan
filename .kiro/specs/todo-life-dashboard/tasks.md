# Implementation Plan: Life Dashboard

## Overview

Build a zero-dependency, single-page Life Dashboard as three files (`index.html`, `css/style.css`, `js/app.js`). Work proceeds in scaffolding-first order: file skeleton → CSS foundation → IIFE shell with Storage → one widget at a time → integration polish. Each task is small enough to open in a browser and visually verify before moving on.

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) and are tagged with `// Feature: todo-life-dashboard, Property N: <property_text>`. Unit tests use the browser console or a simple test-runner script alongside `app.js`.

---

## Tasks

- [x] 1. Create project skeleton — three empty files and a test runner stub
  - Create `index.html` with `<!DOCTYPE html>`, `<html lang="en">`, `<head>` (charset, viewport, title), and an empty `<body>`.
  - Create `css/style.css` as an empty file (linked from `index.html`).
  - Create `js/app.js` as an empty file (linked at the bottom of `<body>`).
  - Create `js/app.test.js` as an empty file — this will hold all unit and property tests.
  - Verify: open `index.html` via `file://`; browser console shows no errors.
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 2. Implement the Storage utility and CSS custom-property foundation
  - [x] 2.1 Add CSS custom properties for the light theme (colours, font sizes, spacing) to `style.css`; add a `.theme-dark` override block that redefines only the colour tokens.
    - Add `transition: background-color 150ms, color 150ms` to `:root` so theme switches animate within 200 ms.
    - _Requirements: 5.2, 5.5_

  - [x] 2.2 Add the IIFE shell to `app.js` and implement the `Storage` module inside it.
    - `Storage.get(key)` — `JSON.parse(localStorage.getItem(key))`; wraps in try/catch; returns `null` on error.
    - `Storage.set(key, value)` — `localStorage.setItem(key, JSON.stringify(value))`; wraps in try/catch; returns `true`/`false`.
    - `Storage.available()` — probes with a test write; returns boolean.
    - Add `document.addEventListener('DOMContentLoaded', () => { /* widget inits go here */ })` at the bottom of the IIFE.
    - _Requirements: 6.5_

  - [x] 2.3 Write unit tests for `Storage` in `app.test.js`
    - Mock `localStorage` to simulate unavailability; assert `get` returns `null` and `set` returns `false`.
    - Assert `available()` returns `false` when `localStorage.setItem` throws.
    - _Requirements: 6.5_

- [x] 3. Implement FOUC prevention and the Theme module
  - [x] 3.1 Add the inline anti-FOUC `<script>` block to `<head>` (before the `<link>` to `style.css`).
    - Reads `localStorage.getItem('theme')`; falls back to `prefers-color-scheme: dark`; adds `theme-dark` to `<html>` synchronously.
    - _Requirements: 5.3, 5.4_

  - [x] 3.2 Add the `#theme-toggle` button to `index.html` (outside `<main>`, always visible).
    - _Requirements: 5.1_

  - [x] 3.3 Implement the `Theme` module in `app.js`.
    - `Theme.init()` — reads `Storage.get('theme')`; applies `theme-dark` class if needed; wires click handler on `#theme-toggle`.
    - Toggle handler — flips the class, writes the new value to `Storage.set('theme', ...)`.
    - _Requirements: 5.2, 5.6_

  - [x] 3.4 Write property test for theme preference round-trip (Property 14)
    - `// Feature: todo-life-dashboard, Property 14: Theme preference round-trip`
    - Generate `fc.constantFrom('light', 'dark')`; call `Storage.set('theme', v)`; assert `Storage.get('theme') === v`.
    - **Validates: Requirements 5.6**

- [x] 4. Build the HTML layout skeleton and base CSS Grid
  - Add `<main>` to `index.html` with four named child sections: `#greeting`, `#timer`, `#quicklinks`, `#todo`.
  - Apply `display: grid` with `grid-template-areas: "greeting greeting" "timer quicklinks" "todo todo"` on `<main>` in `style.css`.
  - Add a `@media (max-width: 600px)` block that collapses to a single column.
  - Verify: open in browser; four labelled placeholder regions visible; no overflow.
  - _Requirements: 6.3_

- [ ] 5. Implement the Greeting widget
  - [x] 5.1 Add Greeting widget markup to `#greeting` in `index.html`.
    - Elements: `#clock`, `#date`, `#greeting-text`, `#name-input`, `#name-save-btn`, `#name-error`.
    - _Requirements: 1.1, 1.2, 1.3–1.6, 1.9_

  - [x] 5.2 Implement the pure helper `getGreetingPhrase(hour)` in `app.js`.
    - 05–11 → "Good morning"; 12–17 → "Good afternoon"; 18–20 → "Good evening"; 21–04 → "Good night".
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 5.3 Write property test for greeting phrase coverage (Property 3)
    - `// Feature: todo-life-dashboard, Property 3: Greeting phrase covers every hour`
    - `fc.integer({ min: 0, max: 23 })` → assert result is one of four strings, never empty, never throws.
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [x] 5.4 Implement the pure helpers `formatTime(h, m, s)` and `formatDate(date)` in `app.js`.
    - `formatTime` — two `padStart(2,'0')` calls; output `HH:MM:SS`.
    - `formatDate` — uses `Intl.DateTimeFormat` with `{ weekday:'long', day:'2-digit', month:'long', year:'numeric' }`.
    - _Requirements: 1.1, 1.2_

  - [-] 5.5 Write property test for time format validity (Property 1)
    - `// Feature: todo-life-dashboard, Property 1: Time format is always valid`
    - `fc.integer({min:0,max:23})`, two `fc.integer({min:0,max:59})` → assert output matches `/^\d{2}:\d{2}:\d{2}$/`.
    - **Validates: Requirements 1.1**

  - [-] 5.6 Write property test for date format validity (Property 2)
    - `// Feature: todo-life-dashboard, Property 2: Date format matches expected pattern`
    - `fc.date()` → assert output contains a full weekday name and a 4-digit year.
    - **Validates: Requirements 1.2**

  - [ ] 5.7 Implement `Greeting.init()` and the name save flow in `app.js`.
    - Start `setInterval(tick, 1000)` where `tick` calls `formatTime` and `formatDate` and writes to `#clock` and `#date`.
    - Set `#greeting-text` via `getGreetingPhrase(new Date().getHours())` + optional name suffix from `Storage.get('greeting_name')`.
    - Wire `#name-save-btn`: trim input, validate (non-empty, ≤ 50 chars), call `Storage.set('greeting_name', ...)`, update greeting text, or show `#name-error`.
    - On Storage error from `Storage.available()` / `Storage.set`, show "Could not save name — storage is unavailable." in `#name-error`.
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [~] 5.8 Write property test for custom name save round-trip (Property 4)
    - `// Feature: todo-life-dashboard, Property 4: Custom name save round-trip`
    - `fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)` → save then read; assert equal.
    - **Validates: Requirements 1.10**

  - [~] 5.9 Write property test for whitespace-only name rejection (Property 5)
    - `// Feature: todo-life-dashboard, Property 5: Whitespace-only name rejection`
    - `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` → assert Storage unchanged, error non-empty.
    - **Validates: Requirements 1.11**

- [~] 6. Checkpoint — Greeting widget working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement the Focus Timer widget
  - [~] 7.1 Add Timer widget markup to `#timer` in `index.html`.
    - Elements: `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`.
    - _Requirements: 2.1, 2.7, 2.8, 2.9_

  - [~] 7.2 Implement the pure helper `deriveTimerControls({ remaining, running })` in `app.js`.
    - Returns `{ startDisabled, stopDisabled, resetDisabled }` per the design's control-state rules.
    - _Requirements: 2.7, 2.8, 2.9_

  - [~] 7.3 Write property test for timer control state consistency (Property 15)
    - `// Feature: todo-life-dashboard, Property 15: Timer control state is internally consistent`
    - `fc.record({ remaining: fc.integer({min:0,max:1500}), running: fc.boolean() })` → assert all three flag invariants hold simultaneously.
    - **Validates: Requirements 2.7, 2.8, 2.9**

  - [~] 7.4 Implement `Timer.init()` and countdown logic in `app.js`.
    - State: `{ remaining: 1500, running: false, intervalId: null }`.
    - `tick()` decrements `remaining`; at 0 clears interval, adds flash class to `#timer-display`, calls `playBeep()`.
    - `playBeep()` — creates `AudioContext`, `OscillatorNode` at 880 Hz sine; plays 1 000 ms; stores ref in `oscillatorRef`; sets ref to `null` on end; wraps in try/catch (silent failure if blocked).
    - Start/Stop/Reset handlers update state, call `deriveTimerControls`, apply disabled attributes.
    - Reset also calls `oscillatorRef.stop()` if ref is non-null, removes flash class, sets `remaining = 1500`.
    - `renderTimer()` formats `remaining` via `formatTime` and writes to `#timer-display`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [~] 8. Checkpoint — Timer widget working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement the To-Do List widget
  - [~] 9.1 Add TodoList widget markup to `#todo` in `index.html`.
    - Elements: `#todo-input`, `#todo-add-btn`, `#todo-error`, `#todo-list` (`<ul>`).
    - _Requirements: 3.1_

  - [~] 9.2 Implement the pure helper `generateId()` in `app.js`.
    - `Date.now().toString(36) + Math.random().toString(36).slice(2)`.

  - [~] 9.3 Implement task validation helpers `validateTaskText(text, existingTasks, excludeId?)` in `app.js`.
    - Returns `{ valid: boolean, error: string }`.
    - Checks: non-empty after trim; ≤ 500 chars; not a case-insensitive duplicate among incomplete tasks (excluding `excludeId`).
    - _Requirements: 3.3, 3.4, 3.7, 3.8_

  - [~] 9.4 Write property test for valid task addition grows list by 1 (Property 6)
    - `// Feature: todo-life-dashboard, Property 6: Valid task addition grows the list by one`
    - `fc.string`, `fc.array(taskArbitrary)` → add valid task; assert length + 1, task appears in Storage.
    - **Validates: Requirements 3.2**

  - [~] 9.5 Write property test for invalid task leaves list unchanged (Property 7)
    - `// Feature: todo-life-dashboard, Property 7: Invalid task addition leaves the list unchanged`
    - Generate empty/too-long/duplicate text → assert array unchanged, error non-empty.
    - **Validates: Requirements 3.3, 3.4**

  - [~] 9.6 Implement `TodoList.init()`, `renderList()`, and add/complete/delete flows in `app.js`.
    - `init()` — `Storage.get('todo_tasks')` populates in-memory array; calls `renderList()`.
    - `renderList()` — rebuilds `<ul id="todo-list">` from array; each `<li>` has `.task-text`, `.task-complete-btn`, `.task-edit-btn`, `.task-delete-btn`; completed tasks get class `task--completed` (strikethrough via CSS).
    - Add flow: validate, push `{ id, text, completed: false }`, persist, re-render, clear input.
    - Complete flow: toggle `completed`; persist; re-render.
    - Delete flow: splice by id; persist; re-render.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.10, 3.11, 3.12_

  - [~] 9.7 Write property test for task persistence round-trip (Property 8)
    - `// Feature: todo-life-dashboard, Property 8: Task persistence round-trip`
    - `fc.array(taskArbitrary)` → serialise then deserialise; assert deep equal, same order.
    - **Validates: Requirements 3.2, 3.11**

  - [~] 9.8 Write property test for completion toggle is an involution (Property 9)
    - `// Feature: todo-life-dashboard, Property 9: Completion toggle is an involution`
    - `taskArbitrary` → toggle twice; assert `completed` unchanged.
    - **Validates: Requirements 3.5**

  - [~] 9.9 Write property test for task deletion removes exactly one (Property 10)
    - `// Feature: todo-life-dashboard, Property 10: Task deletion removes exactly one task`
    - `fc.array(taskArbitrary, { minLength: 1 })`, `fc.integer` → delete; assert length N-1, id absent, order preserved.
    - **Validates: Requirements 3.10**

  - [~] 9.10 Implement inline edit mode for tasks in `app.js`.
    - Edit button replaces `.task-text` with `.task-edit-input` (pre-filled) and shows confirm/cancel buttons and `.task-edit-error`.
    - Confirm: run `validateTaskText` excluding self; on pass update text, persist, re-render; on fail show `.task-edit-error`.
    - Cancel: re-render (discards changes, no Storage write).
    - _Requirements: 3.6, 3.7, 3.8, 3.9_

- [~] 10. Checkpoint — To-Do List widget working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement the Quick Links widget
  - [~] 11.1 Add QuickLinks widget markup to `#quicklinks` in `index.html`.
    - Elements: `#quicklinks-label-input`, `#quicklinks-url-input`, `#quicklinks-add-btn`, `#quicklinks-error`, `#quicklinks-list`.
    - _Requirements: 4.1_

  - [~] 11.2 Implement link validation helper `validateLink(label, url, existingLinks)` in `app.js`.
    - Returns `{ valid: boolean, error: string }`.
    - Checks (with specific per-field messages from the design): label non-empty, label ≤ 50 chars; URL non-empty, URL starts with `http://` or `https://`, URL ≤ 2048 chars; total links < 20.
    - _Requirements: 4.3, 4.4_

  - [~] 11.3 Write property test for valid link grows list by 1 (Property 11)
    - `// Feature: todo-life-dashboard, Property 11: Valid link addition grows the list by one`
    - Valid (label, url) + array length < 20 → add; assert length + 1.
    - **Validates: Requirements 4.2**

  - [~] 11.4 Write property test for URL validator accepts only http(s) (Property 12)
    - `// Feature: todo-life-dashboard, Property 12: URL validation accepts only http(s) schemes`
    - Arbitrary scheme strings → assert rejected; `fc.webUrl()` → assert accepted.
    - **Validates: Requirements 4.3**

  - [~] 11.5 Implement `QuickLinks.init()`, `renderLinks()`, and add/open/delete flows in `app.js`.
    - `init()` — `Storage.get('quicklinks')` populates in-memory array; calls `renderLinks()`.
    - `renderLinks()` — rebuilds `#quicklinks-list`; each entry has a launch button (`window.open(url, '_blank', 'noopener,noreferrer')`) and a delete button.
    - Add flow: validate, push `{ id, label, url }`, persist (check `Storage.available()`; show `#quicklinks-error` if false), re-render.
    - Delete flow: splice by id; persist; re-render.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [~] 11.6 Write property test for link persistence preserves insertion order (Property 13)
    - `// Feature: todo-life-dashboard, Property 13: Link persistence preserves insertion order`
    - `fc.array(linkArbitrary)` → serialise then deserialise; assert deep equal, same insertion order.
    - **Validates: Requirements 4.7**

- [~] 12. Checkpoint — Quick Links widget working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Apply CSS styling and responsive layout
  - [~] 13.1 Style all four widgets in `style.css` using the CSS custom-property tokens defined in task 2.1.
    - Apply named `grid-area` values (`greeting`, `timer`, `quicklinks`, `todo`) to each section.
    - Style inputs, buttons, error messages, and completed task strikethrough (`.task--completed`).
    - _Requirements: 3.12, 6.3_

  - [~] 13.2 Verify responsive collapse at 600 px and cross-browser rendering.
    - Open in Chrome, Firefox, Edge; confirm no overflow, no overlapping interactive elements, no JS console errors.
    - _Requirements: 6.3, 6.4_

- [~] 14. Final integration checkpoint — Ensure all tests pass
  - Seed `localStorage` manually with tasks, links, a name, and a theme; reload the page; confirm everything restores correctly.
  - Run all tests in `app.test.js`; ensure all pass.
  - Confirm the page works via `file://` with no network requests (DevTools Network tab should show no requests).
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.4, 6.5_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation at logical breakpoints.
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations each).
- Unit tests validate specific examples and edge cases.
- The inline FOUC-prevention script in `<head>` must remain outside the IIFE and run synchronously before `style.css` renders.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3"] },
    { "id": 5, "tasks": ["3.4"] },
    { "id": 6, "tasks": ["4"] },
    { "id": 7, "tasks": ["5.1", "5.2"] },
    { "id": 8, "tasks": ["5.3", "5.4"] },
    { "id": 9, "tasks": ["5.5", "5.6", "5.7"] },
    { "id": 10, "tasks": ["5.8", "5.9"] },
    { "id": 11, "tasks": ["6"] },
    { "id": 12, "tasks": ["7.1", "7.2"] },
    { "id": 13, "tasks": ["7.3", "7.4"] },
    { "id": 14, "tasks": ["8"] },
    { "id": 15, "tasks": ["9.1", "9.2"] },
    { "id": 16, "tasks": ["9.3"] },
    { "id": 17, "tasks": ["9.4", "9.5", "9.6"] },
    { "id": 18, "tasks": ["9.7", "9.8", "9.9", "9.10"] },
    { "id": 19, "tasks": ["10"] },
    { "id": 20, "tasks": ["11.1", "11.2"] },
    { "id": 21, "tasks": ["11.3", "11.4", "11.5"] },
    { "id": 22, "tasks": ["11.6"] },
    { "id": 23, "tasks": ["12"] },
    { "id": 24, "tasks": ["13.1"] },
    { "id": 25, "tasks": ["13.2"] },
    { "id": 26, "tasks": ["14"] }
  ]
}
```
