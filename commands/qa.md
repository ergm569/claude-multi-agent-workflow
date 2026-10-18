---
description: Run the code quality workflow on course-api, which reviews code and coverage in parallel, then writes the missing tests and reports
argument-hint: "[files or branch]"
---
Run the code-qa workflow on the Express API in `course-api/`. Follow these steps in order.

## 1. Scope

- If arguments were given (`$ARGUMENTS`), use them as the scope: a list of files, or a branch to compare against.
- Otherwise, collect the files under `course-api/` that changed with `git diff --name-only main...HEAD` plus the uncommitted changes from `git status --short`.
- If nothing under `course-api/` changed, review `course-api/routes/`, `course-api/db/` and `course-api/tests/` in full.

Split the scope into **source files** (`server.js`, `routes/`, `db/`) and **test files** (`tests/`).

## 2. Analyse (in parallel)

These three jobs do not depend on each other. Start them together, in a single message:

- **Code review:** launch the `code-qa:code-reviewer` subagent with the source files and the focus *code*.
- **Coverage review:** launch a second `code-qa:code-reviewer` subagent with the route files plus the test files and the focus *coverage*.
- **Baseline:** while they run, run `npm test` and `npm run lint` from `course-api/` yourself and note the results.

Wait for all three to finish before moving on.

## 3. Write tests (depends on step 2)

Launch the `code-qa:test-writer` subagent. Pass it the missing cases from the coverage review and any high or medium findings from the code review that a test can prove. Wait for its result.

## 4. Report (depends on step 3)

Give a short report:

1. **Findings** grouped by severity, with `file:line` and the fix.
2. **Tests added**, one line each.
3. **Before → after:** test counts and lint result from the baseline and from the test-writer run.
4. **Bugs exposed:** tests left failing and the bug each one shows.

Do not change the API code yourself. Fixing the bugs is a separate decision for the user.
