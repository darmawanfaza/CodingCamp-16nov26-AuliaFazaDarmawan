# Design Document

## Overview

The Life Dashboard is a single-page, client-side web application delivered as three files: `index.html`, `css/style.css`, and `js/app.js`. It has no build step, no framework, and no external dependencies — it runs directly from the filesystem via the `file://` protocol.

The page hosts four independent widgets arranged in a CSS Grid layout:

- **Greeting Widget** — live clock, date, time-of-day greeting, custom name
- **Focus Timer** — 25-minute Pomodoro-style countdown with Start/Stop/Reset
- **To-Do List** — add, edit, complete, and delete tasks with inline validation
- **Quick Links** — save and launch URL shortcuts, up to 20 links

A fifth cross-cutting concern — **Theme** — switches between light and dark colour schemes without a page reload. Theme is applied via an inline `<script>` block in `<head>` before any CSS renders, preventing a flash of the wrong theme (FOUC).

All persistence uses `localStorage` only. No network requests are made.

---

## Architecture

### File Structure

```
index.html          ← single HTML entry point; contains inline FOUC-prevention script
css/
  style.css         ← all styles; uses CSS custom properties for theming
js/
  app.js            ← all application logic; IIFE module pattern
```

### Module Pattern

`app.js` uses an immediately-invoked function expression (IIFE) to avoid polluting the global scope. Inside the IIFE, each widget is an isolated object with `init()`, internal state, and private helper functions. A shared `Storage` utility wraps `localStorage` with a try/catch guard.

```
(function () {
  const Storage   = { ... };   // localStorage façade
  const Theme     = { ... };   // theme toggle + persistence
  const Greeting  = { ... };   // clock, date, greeting, custom name
  const Timer     = { ... };   // countdown logic, Web Audio beep
  const TodoList  = { ... };   // task CRUD, validation, persistence
  const QuickLinks = { ... };  // link CRUD, validation, persistence

  document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Greeting.init();
    Timer.init();
    TodoList.init();
    QuickLinks.init();
  });
})();
```

### Theme Anti-FOUC Strategy

An inline `<script>` in `<head>` (before any stylesheet link) reads `localStorage.getItem('theme')`. If the value is `'dark'`, or if it is absent and `window.matchMedia('(prefers-color-scheme: dark)').matches`, it adds the class `theme-dark` to `<html>` synchronously. The CSS then uses that class to activate dark-mode custom-property overrides.

```html
<head>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved === 'dark' || (!saved && prefersDark)) {
          document.documentElement.classList.add('theme-dark');
        }
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="css/style.css">
</head>
```

### Layout

```
+--------------------------------------------------+
|  Theme toggle                      [🌙]          |
+--------------------------------------------------+
|  Greeting Widget (full width)                    |
+------------------------+-------------------------+
|  Focus Timer           |  Quick Links            |
+------------------------+-------------------------+
|  To-Do List (full width)                         |
+--------------------------------------------------+
```

Implemented with CSS Grid on the `<main>` element:

```css
main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "greeting  greeting"
    "timer     quicklinks"
    "todo      todo";
}
```

On viewports narrower than 600 px, all areas collapse to a single column.

---

## Components and Interfaces

### Storage Utility

```js
const Storage = {
  get(key) { ... },            // returns parsed JSON or null; catches exceptions
  set(key, value) { ... },     // serialises to JSON; returns true/false
  available() { ... }          // probes localStorage with a test write; returns boolean
};
```

All widget modules call `Storage.set` / `Storage.get`. They never call `localStorage` directly.

### Theme Module

| Responsibility | Detail |
|---|---|
| Read saved preference | `Storage.get('theme')` → `'light'` \| `'dark'` \| `null` |
| Apply theme | Toggle class `theme-dark` on `<html>` |
| Persist on toggle | `Storage.set('theme', newTheme)` |
| OS fallback | `window.matchMedia('(prefers-color-scheme: dark)')` |
| Toggle speed | CSS `transition: background-color 150ms, color 150ms` on `:root` keeps the swap under 200 ms |

DOM target: `#theme-toggle` button.

### Greeting Module

| Responsibility | Detail |
|---|---|
| Clock update | `setInterval` every 1 000 ms; formats with `String.padStart(2, '0')` |
| Date formatting | `Intl.DateTimeFormat` with `{ weekday:'long', day:'2-digit', month:'long', year:'numeric' }` |
| Greeting text | Derives from `new Date().getHours()` via a pure `getGreetingPhrase(hour)` function |
| Custom name | `Storage.get('greeting_name')` on init; `Storage.set` on save |
| Validation | Rejects empty / whitespace-only strings and strings longer than 50 chars |

DOM targets: `#clock`, `#date`, `#greeting-text`, `#name-input`, `#name-save-btn`, `#name-error`.

### Timer Module

| Responsibility | Detail |
|---|---|
| State | `{ remaining: 1500, running: false, intervalId: null }` |
| Countdown | `setInterval` every 1 000 ms decrements `remaining` |
| Completion | At `remaining === 0`: clear interval, flash `#timer-display`, call `playBeep()` |
| Beep | Web Audio API — creates an `OscillatorNode` (frequency 880 Hz, type `'sine'`) connected to `AudioContext.destination`; plays for 1 000 ms |
| Reset | Clears interval, cancels oscillator if still playing, removes flash class, sets `remaining = 1500` |
| Control state | Derives `{ startDisabled, stopDisabled, resetDisabled }` from current state; applied after every state change |

DOM targets: `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`.

Display format: `MM:SS` via two `padStart(2,'0')` calls.

### TodoList Module

| Responsibility | Detail |
|---|---|
| Data structure | Array of `{ id, text, completed }` objects |
| ID generation | `Date.now().toString(36) + Math.random().toString(36).slice(2)` |
| Add validation | Trimmed text: non-empty, ≤ 500 chars, case-insensitive unique among incomplete tasks |
| Edit validation | Same rules, excluding the task being edited from the duplicate check |
| Render | `renderList()` rebuilds `<ul id="todo-list">` from the in-memory array on every mutation |
| Strikethrough | Completed tasks receive CSS class `task--completed` |
| Persistence | `Storage.set('todo_tasks', tasks)` after every mutation |
| Restore | `Storage.get('todo_tasks')` on `init()` |

DOM targets: `#todo-input`, `#todo-add-btn`, `#todo-error`, `#todo-list`.

Each task `<li>` has: `.task-text`, `.task-complete-btn`, `.task-edit-btn`, `.task-delete-btn`, `.task-edit-input`, `.task-edit-error`.

### QuickLinks Module

| Responsibility | Detail |
|---|---|
| Data structure | Array of `{ id, label, url }` objects |
| Add validation | Label: non-empty, ≤ 50 chars; URL: non-empty, starts with `http://` or `https://`, ≤ 2048 chars; total links < 20 |
| Error specificity | Error message names which field failed and why |
| Open link | `window.open(url, '_blank', 'noopener,noreferrer')` |
| Delete | Removes by id, persists, re-renders |
| Persistence | `Storage.set('quicklinks', links)` after every mutation |
| Restore | `Storage.get('quicklinks')` on `init()`, preserves insertion order |
| Storage error | `Storage.available()` check on persist; show `#quicklinks-error` if false |

DOM targets: `#quicklinks-label-input`, `#quicklinks-url-input`, `#quicklinks-add-btn`, `#quicklinks-error`, `#quicklinks-list`.

---

## Data Models

### localStorage Keys

| Key | Type | Description |
|---|---|---|
| `theme` | `'light' \| 'dark'` | User's chosen colour scheme |
| `greeting_name` | `string` | Custom name, 1–50 chars |
| `todo_tasks` | `Task[]` (JSON) | Ordered array of task objects |
| `quicklinks` | `Link[]` (JSON) | Ordered array of link objects |

### Task Object

```ts
interface Task {
  id: string;          // unique identifier
  text: string;        // 1–500 characters, trimmed
  completed: boolean;  // true = done
}
```

### Link Object

```ts
interface Link {
  id: string;    // unique identifier
  label: string; // 1–50 characters
  url: string;   // starts with http:// or https://, max 2048 chars
}
```

### Validation Rules Summary

| Widget | Field | Rule |
|---|---|---|
| Greeting | name | 1–50 chars after trim |
| TodoList | task text (add) | 1–500 chars after trim; case-insensitive unique among incomplete tasks |
| TodoList | task text (edit) | 1–500 chars after trim; case-insensitive unique excluding self |
| QuickLinks | label | 1–50 chars |
| QuickLinks | url | starts with `http://` or `https://`; max 2 048 chars |
| QuickLinks | count | total saved links < 20 |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time format is always valid

*For any* triple of integers (hour ∈ 0–23, minute ∈ 0–59, second ∈ 0–59), the time formatting function SHALL return a string that matches the pattern `HH:MM:SS` (exactly two digits per segment, separated by colons).

**Validates: Requirements 1.1**

### Property 2: Date format matches expected pattern

*For any* valid `Date` object, the date formatting function SHALL return a string matching `<Weekday>, DD <Month> YYYY` where the weekday and month are full English names and the day and year are the correct numeric values for that date.

**Validates: Requirements 1.2**

### Property 3: Greeting phrase covers every hour

*For any* integer hour in the range 0–23, `getGreetingPhrase(hour)` SHALL return exactly one of "Good morning", "Good afternoon", "Good evening", or "Good night" and SHALL never return an empty string or throw.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

### Property 4: Custom name save round-trip

*For any* string of 1–50 characters where the trimmed form is non-empty, saving it as the custom name and then reading it back from Storage SHALL produce the same string.

**Validates: Requirements 1.10**

### Property 5: Whitespace-only name rejection

*For any* string whose trimmed value is empty (empty string, spaces, tabs, or newlines only), attempting to save it as a custom name SHALL leave Storage unchanged and produce a non-empty error message.

**Validates: Requirements 1.11**

### Property 6: Valid task addition grows the list by one

*For any* array of existing tasks and any task description that is non-empty after trimming, is at most 500 characters, and is not a case-insensitive match of any existing incomplete task's text, adding it SHALL increase the task count by exactly one and the new task SHALL appear in Storage.

**Validates: Requirements 3.2**

### Property 7: Invalid task addition leaves the list unchanged

*For any* array of existing tasks and any task description that is empty after trimming, exceeds 500 characters, or matches an existing incomplete task case-insensitively, attempting to add it SHALL leave the task array unmodified and SHALL produce a non-empty inline error message.

**Validates: Requirements 3.3, 3.4**

### Property 8: Task persistence round-trip

*For any* array of Task objects, serialising it to Storage and then deserialising it SHALL produce an array with identical `id`, `text`, and `completed` values in the same order.

**Validates: Requirements 3.2, 3.11**

### Property 9: Completion toggle is an involution

*For any* Task regardless of its current `completed` value, toggling completion and then toggling it again SHALL return the Task to its original `completed` value.

**Validates: Requirements 3.5**

### Property 10: Task deletion removes exactly one task

*For any* task array of length N and any valid task id present in that array, deleting that task SHALL produce an array of length N − 1 that does not contain any task with that id, and all other tasks SHALL remain in their original order.

**Validates: Requirements 3.10**

### Property 11: Valid link addition grows the list by one

*For any* array of fewer than 20 links and any (label, url) pair where label is non-empty within 50 characters and url starts with `http://` or `https://` within 2 048 characters, adding it SHALL increase the link count by exactly one.

**Validates: Requirements 4.2**

### Property 12: URL validation accepts only http(s) schemes

*For any* string that does not begin with `http://` or `https://`, the URL validator SHALL reject it; *for any* string that begins with `http://` or `https://` and is within 2 048 characters, the URL validator SHALL accept it.

**Validates: Requirements 4.3**

### Property 13: Link persistence preserves insertion order

*For any* array of Link objects, serialising it to Storage and then deserialising it SHALL produce an array with identical `id`, `label`, and `url` values in the same insertion order.

**Validates: Requirements 4.7**

### Property 14: Theme preference round-trip

*For any* theme value (`'light'` or `'dark'`), saving it to Storage and then reading it back SHALL produce the same value.

**Validates: Requirements 5.6**

### Property 15: Timer control state is internally consistent

*For any* timer state `{ remaining, running }`, the derived control state SHALL satisfy all of the following simultaneously: Start is disabled if and only if the timer is running; Stop is disabled if and only if the timer is not running; at `remaining === 0` both Start and Stop are disabled and only Reset is enabled.

**Validates: Requirements 2.7, 2.8, 2.9**

---

## Error Handling

### Storage Unavailability

`Storage.available()` probes `localStorage` with a test write inside a try/catch. All `Storage.set` calls are also wrapped. When Storage is unavailable:

- **Greeting name save**: shows `#name-error` with a message such as "Could not save name — storage is unavailable." The previously saved name (or no-name state) is preserved.
- **Greeting on page load**: if `Storage.get` throws, the greeting displays without a name suffix.
- **QuickLinks persist/restore**: shows `#quicklinks-error`; the in-memory panel state is left unchanged.
- **TodoList**: follows the same pattern as QuickLinks.

### Inline Validation Errors

Each widget displays errors adjacent to the failing input, never in a modal or alert. Errors are cleared on the next successful action or when the input changes. Specific messages:

| Situation | Message |
|---|---|
| Empty/whitespace task | "Task description cannot be empty." |
| Task > 500 chars | "Task description must be 500 characters or fewer." |
| Duplicate task | "A task with that description already exists." |
| Empty name | "Name cannot be empty." |
| Name > 50 chars | "Name must be 50 characters or fewer." |
| Missing link label | "Please enter a label." |
| Label > 50 chars | "Label must be 50 characters or fewer." |
| Missing URL | "Please enter a URL." |
| Invalid URL scheme | "URL must start with http:// or https://." |
| URL > 2048 chars | "URL must be 2048 characters or fewer." |
| Link cap reached | "You have reached the 20-link limit." |

### Timer Edge Cases

- If `AudioContext` creation fails (e.g., browser policy blocks it), the timer still stops and shows the visual indicator; the beep is silently skipped.
- Multiple `playBeep()` calls are guarded: a module-level `oscillatorRef` is set to `null` after the oscillator stops, preventing double-play.
- `Reset` calls `oscillatorRef.stop()` and sets `oscillatorRef = null` if the oscillator is still playing.

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and integration points. They should be written for:

- `getGreetingPhrase(hour)` — test each boundary (0, 5, 12, 18, 21, 23)
- `Storage.get` / `Storage.set` — mock `localStorage` to test the unavailable path
- Task validation — empty string, whitespace string, 500-char string, 501-char string, duplicate detection (case-insensitive)
- Link validation — missing scheme, `ftp://` prefix, `http://` prefix, `https://` prefix, 2048-char URL, 2049-char URL, 20-link cap
- Timer control state derivation — `{ remaining, running }` combinations map to correct `{ startDisabled, stopDisabled, resetDisabled }`
- Task completion toggle — verify boolean flip

### Property-Based Tests

Property-based testing is applicable here because the core logic (validation, greeting derivation, persistence round-trips, state transitions) consists of pure functions with clearly definable input spaces where input variation meaningfully exercises edge cases.

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript/JavaScript PBT library).

Each property test runs a minimum of **100 iterations**. Each test is tagged with a comment in the format:

```
// Feature: todo-life-dashboard, Property N: <property_text>
```

| Property | Test description | Arbitraries |
|---|---|---|
| P1 — Time format validity | Generate (h,m,s) triples; assert output matches `HH:MM:SS` pattern | `fc.integer({min:0,max:23})`, `fc.integer({min:0,max:59})` ×2 |
| P2 — Date format validity | Generate `Date` objects; assert output matches weekday + DD Month YYYY | `fc.date()` |
| P3 — Greeting covers every hour | Generate `hour` in 0–23; assert result is one of four strings and not empty | `fc.integer({ min: 0, max: 23 })` |
| P4 — Name save round-trip | Generate valid name strings (1–50 chars, not all-whitespace); save then read | `fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)` |
| P5 — Whitespace-only name rejected | Generate all-whitespace strings; assert no save occurs and error is non-empty | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| P6 — Valid task grows list by 1 | Generate valid task text + existing task array; add; assert length + 1 | `fc.string`, `fc.array(taskArbitrary)` |
| P7 — Invalid task leaves list unchanged | Generate invalid task text (empty, > 500, duplicate); assert array unchanged and error non-empty | Various filtered arbitraries |
| P8 — Task persistence round-trip | Generate `Task[]`; serialise then deserialise; assert deep equal, same order | `fc.array(taskArbitrary)` |
| P9 — Completion toggle is involution | Generate a Task; toggle twice; assert `completed` unchanged | `taskArbitrary` |
| P10 — Task deletion removes exactly one | Generate task array + index; delete; assert length − 1, absent id, order preserved | `fc.array(taskArbitrary)`, `fc.integer` |
| P11 — Valid link grows list by 1 | Generate valid (label, url) + links array with length < 20; add; assert length + 1 | `fc.string`, `fc.webUrl` |
| P12 — URL validator accepts only http(s) | Generate URLs with arbitrary schemes; assert acceptance iff starts with http(s) | `fc.string`, `fc.webUrl` |
| P13 — Link persistence preserves order | Generate `Link[]`; serialise then deserialise; assert deep equal, same insertion order | `fc.array(linkArbitrary)` |
| P14 — Theme preference round-trip | Generate theme value ('light'\|'dark'); save then read; assert same value | `fc.constantFrom('light', 'dark')` |
| P15 — Timer control state consistency | Generate `{remaining, running}`; derive control state; assert Start/Stop/Reset flags satisfy all constraints simultaneously | `fc.record({remaining: fc.integer({min:0,max:1500}), running: fc.boolean()})` |

### Integration Tests

Integration tests verify the DOM interaction layer and cross-widget concerns:

- Theme toggle changes `<html>` class and persists to `localStorage`
- Theme applied before first render (no FOUC): verify class is present before `DOMContentLoaded` fires
- Full page load with pre-seeded `localStorage` restores tasks and links
- Timer countdown: fast-forward `setInterval` with fake timers; assert display reaches 00:00 and visual indicator is applied
- Cross-browser: manual verification smoke tests in Chrome, Firefox, Edge, Safari via `file://`
