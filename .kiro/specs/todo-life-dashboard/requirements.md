# Requirements Document

## Introduction

A single-page, client-side Life Dashboard built with HTML, CSS, and Vanilla JavaScript. It combines a live clock/greeting, a Pomodoro-style focus timer, a to-do list, and a quick-links launcher into one clean interface. All user data persists in the browser's Local Storage. No server, no build step, and no framework is required.

## Glossary

- **Dashboard**: The single HTML page that hosts all four widgets.
- **Greeting_Widget**: The section that shows the current date, time, and a personalised greeting.
- **Timer**: The 25-minute countdown focus timer widget.
- **TodoList**: The widget that manages the user's task items.
- **Task**: A single to-do item with text content and a completion state.
- **QuickLinks**: The widget that holds user-defined shortcut buttons to external URLs.
- **Link**: A single quick-link entry with a label and a URL.
- **Storage**: The browser's `localStorage` API used for all client-side persistence.
- **User**: The person viewing and interacting with the Dashboard in a browser.
- **Theme**: The colour scheme of the Dashboard — either `light` or `dark`.

---

## Requirements

### Requirement 1: Live Greeting

**User Story:** As a User, I want to see the current time, date, and a contextual greeting, so that I always know when I am and feel welcomed.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS format, updated every second.
2. THE Greeting_Widget SHALL display the current date in "Day, DD Month YYYY" format (e.g., Monday, 26 November 2026).
3. IF the current local hour is between 05:00 and 11:59, THEN THE Greeting_Widget SHALL display "Good morning".
4. IF the current local hour is between 12:00 and 17:59, THEN THE Greeting_Widget SHALL display "Good afternoon".
5. IF the current local hour is between 18:00 and 20:59, THEN THE Greeting_Widget SHALL display "Good evening".
6. IF the current local hour is between 21:00 and 04:59, THEN THE Greeting_Widget SHALL display "Good night".
7. WHEN a custom name has been saved, THE Greeting_Widget SHALL append the name to the greeting (e.g., "Good morning, Aulia").
8. WHEN no custom name has been saved, THE Greeting_Widget SHALL display the greeting without a name suffix.
9. THE Greeting_Widget SHALL provide an input field that accepts a custom name of 1 to 50 characters and a save action to persist that name to Storage.
10. WHEN the User saves a custom name, THE Greeting_Widget SHALL persist the name in Storage so that it survives a page reload.
11. IF the custom name input is empty or contains only whitespace characters when the User activates the save action, THEN THE Greeting_Widget SHALL reject the save and display an error message indicating the name is invalid.
12. IF Storage is unavailable when the User saves a custom name, THEN THE Greeting_Widget SHALL display an error message indicating the name could not be saved and retain the previously saved name or no-name state; IF Storage is unavailable on page load, THEN THE Greeting_Widget SHALL display the greeting without a name suffix.

---

### Requirement 2: Focus Timer

**User Story:** As a User, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can structure focused work sessions.

#### Acceptance Criteria

1. THE Timer SHALL initialise at 25 minutes and 00 seconds (25:00) on page load.
2. WHEN the User activates the Start control, THE Timer SHALL begin counting down one second at a time from the currently displayed time.
3. WHILE the Timer is counting down, THE Timer SHALL update the displayed time every second.
4. WHEN the User activates the Stop control, THE Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the User activates the Reset control, THE Timer SHALL stop any active countdown, clear any active completion visual indicator and any pending or looping audible alert, and reset the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Timer SHALL stop automatically, display a non-dismissing visual indicator (such as a highlighted or flashing display), and play an audible beep of at least one second duration.
7. WHILE the Timer is counting down, THE Timer SHALL disable the Start control and enable the Stop and Reset controls.
8. WHILE the Timer is paused or at the initial state, THE Timer SHALL enable the Start control and disable the Stop control.
9. WHEN the countdown reaches 00:00, THE Timer SHALL disable the Start and Stop controls and enable only the Reset control.

---

### Requirement 3: To-Do List

**User Story:** As a User, I want to add, edit, complete, and delete tasks that persist across sessions, so that I can track what I need to do.

#### Acceptance Criteria

1. THE TodoList SHALL provide an input field and an Add button for entering new tasks.
2. WHEN the User submits a non-empty task whose text does not exceed 500 characters, THE TodoList SHALL add the task to the list and persist all tasks to Storage.
3. WHEN the User submits a task whose text, after trimming whitespace, is identical to an existing incomplete task's text (case-insensitive), THE TodoList SHALL reject the submission and display an inline error message indicating a duplicate.
4. IF the User submits an empty, whitespace-only, or greater than 500 character task, THEN THE TodoList SHALL reject the submission and display an inline error message prompting valid input.
5. WHEN the User activates the complete control on a Task, THE TodoList SHALL toggle the Task's completion state and persist the updated list to Storage.
6. WHEN the User activates the edit control on a Task, THE TodoList SHALL enter inline edit mode for that Task, replacing the task text with an editable input pre-filled with the current text.
7. WHEN the User confirms an edit with non-empty text within 500 characters that does not duplicate any other existing task's text (case-insensitive, excluding the task being edited), THE TodoList SHALL update the Task text and exit edit mode, persisting the change to Storage.
8. IF the User confirms an edit with empty, whitespace-only, or greater than 500 character text, or text that duplicates another existing task (case-insensitive, excluding the task being edited), THEN THE TodoList SHALL display an inline error message within the edit field and remain in inline edit mode.
9. WHEN the User cancels an edit, THE TodoList SHALL discard the changes, restore the original task text, and exit inline edit mode without modifying Storage.
10. WHEN the User activates the delete control on a Task, THE TodoList SHALL remove that Task from the list and persist the updated list to Storage.
11. WHEN the Dashboard is loaded, THE TodoList SHALL restore all previously saved tasks from Storage, preserving their text and completion state.
12. THE TodoList SHALL display completed tasks with strikethrough text so they are distinguishable from incomplete tasks.

---

### Requirement 4: Quick Links

**User Story:** As a User, I want to save and launch shortcut links to favourite websites, so that I can reach them in one click from the Dashboard.

#### Acceptance Criteria

1. THE QuickLinks SHALL provide an input field for a link label (maximum 50 characters), an input field for a URL (maximum 2048 characters), and an Add button.
2. WHEN the User submits a label and a valid URL and the saved link count is fewer than 20, THE QuickLinks SHALL add a shortcut button to the panel and persist all links to Storage.
3. IF the User submits a missing label, a missing URL, a URL that does not begin with `http://` or `https://`, or a label exceeding 50 characters, THEN THE QuickLinks SHALL reject the submission and display an inline error message identifying which field is invalid and why.
4. IF the saved link count is already at 20 when the User submits a valid label and URL, THEN THE QuickLinks SHALL reject the submission and display an inline error message stating the 20-link limit has been reached.
5. WHEN the User clicks a link button, THE QuickLinks SHALL open the saved URL in a new browser tab.
6. WHEN the User activates the delete button on a Link, THE QuickLinks SHALL remove that Link from the panel and persist the updated list to Storage.
7. WHEN the Dashboard is loaded, THE QuickLinks SHALL restore all previously saved links from Storage and display them in the order they were added.
8. IF Storage is unavailable when THE QuickLinks attempts to persist or restore links, THEN THE QuickLinks SHALL display an error message indicating that the operation failed and leave the existing panel state unchanged.

---

### Requirement 5: Light / Dark Mode

**User Story:** As a User, I want to toggle between light and dark colour themes, so that the Dashboard suits my environment and preference.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme toggle control that is persistently present in the interface and not hidden behind any menu or additional interaction.
2. WHEN the User activates the Theme toggle, THE Dashboard SHALL switch to the opposite Theme within 200 milliseconds without a page reload.
3. WHEN a Theme preference has been saved, THE Dashboard SHALL apply that Theme on page load before any content is rendered, preventing a flash of the wrong Theme.
4. WHEN no Theme preference has been saved and the User's browser reports a dark colour scheme preference, THE Dashboard SHALL apply the dark Theme by default.
5. IF no Theme preference has been saved and the User's browser does not report a colour scheme preference, THEN THE Dashboard SHALL apply the light Theme by default.
6. THE Dashboard SHALL persist the User's Theme preference in browser local storage so that it survives a page reload and subsequent browser sessions.

---

### Requirement 6: Single-File Architecture Constraints

**User Story:** As a developer, I want the project to follow a strict folder and file structure, so that the codebase stays clean and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL contain exactly one CSS file, located at `css/style.css`.
2. THE Dashboard SHALL contain exactly one JavaScript file, located at `js/app.js`.
3. WHEN the Dashboard is opened in Chrome, Firefox, Edge, and Safari, THE Dashboard SHALL render all UI sections without JavaScript exceptions, failed resource loads, or any element overflowing or overlapping another interactive element.
4. WHEN the Dashboard is opened via the `file://` protocol without a web server, THE Dashboard SHALL complete all navigation, data reads, data writes, and UI renders without issuing any network requests.
5. THE Dashboard SHALL use only the browser's built-in `localStorage` API for data persistence, with no external libraries loaded via CDN, `<script>` tags referencing remote URLs, npm packages, or backend calls.
