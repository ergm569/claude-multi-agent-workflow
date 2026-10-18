# NOTES

## What the plugin does and how to install it

`code-qa` is a code quality kit for the Express API in `course-api/`. One command, `/code-qa:qa`, runs a multi-agent workflow:
1. It collects the changed files.
2. It reviews the code and the test coverage in parallel.
3. It writes the missing tests.
4. It reports the findings, the tests added and the bugs those tests expose.

The plugin also bundles:
- a skill, `code-qa:api-conventions`, with the API's conventions and test template;
- a `PostToolUse` hook that lints every JavaScript file right after Claude writes or edits it.

Install it from this repo, which doubles as its marketplace:

```
/plugin marketplace add ergm569/claude-multi-agent-workflow
/plugin install code-qa@code-qa-marketplace
```

For development, load it without installing: `claude --plugin-dir <path to this repo>`.

## Scoping decision: tools and model per subagent

- **`code-reviewer`** gets only `Read`, `Grep` and `Glob`.
  - Its job is to judge code, never to change it. Without `Write`, `Edit` or `Bash` it cannot touch files or run commands, however the prompt is phrased.
  - It does not need `Bash` either: the workflow command collects the changed files with git and passes the list to it.
  - It runs on `sonnet`, because finding real bugs (unvalidated ids, a `PUT` that accepts `null`) takes reasoning.
- **`test-writer`** gets `Write`, `Edit` and `Bash`.
  - It has to create test files and run `npm test` to see whether they pass.
  - Its prompt limits writes to `course-api/tests/` and Bash to `npm test`, and the lint hook checks every file it writes.
  - It runs on `haiku`: the task is mechanical once the cases are known, since it fills the test template from the skill once per case. A cheaper, faster model is enough.
- **The skill is preloaded** into both subagents through the `skills:` frontmatter field. The conventions live in one place, and both agents judge and write against the same rules.

## Orchestration decision: what runs in parallel and what waits

- **In parallel (step 2):** the code review, the coverage review and the baseline `npm test` + `npm run lint`.
  - None of them needs another's output: each one only reads the code.
  - Running them together makes the slowest part of the workflow as long as one review instead of three.
  - The same `code-reviewer` runs twice with a different focus, which also shows that one tightly scoped agent can be reused.
- **In sequence (steps 3 and 4):**
  - `test-writer` waits for both reviews, because their findings are its input. Without them it would write tests blindly.
  - The final report waits for `test-writer`, because "before → after" and "bugs exposed" only exist once the new tests have run.

## How it was tested

- **Loading:** with `--plugin-dir`, the session lists `code-qa:code-reviewer`, `code-qa:test-writer`, `/code-qa:qa` and `code-qa:api-conventions`.
- **Workflow:** `/code-qa:qa` launched both reviewers and the baseline in one message, then `test-writer`, then the report.
  - It added 18 tests and left the suite at 23 tests, with 15 passing and 8 failing.
  - Each failing test exposes a real bug, for example `GET /users/abc` returning 404 instead of 400.
  - The API code was not changed, and the generated tests were not committed.
- **Hook:** `PostToolUse:Write` fired on every file `test-writer` wrote, which confirms that plugin hooks also apply to subagents. Run directly, the script exits `2` with ESLint's errors for a broken file and `0` for a clean or non-JS file.
- **Skill:** "Add a test for GET /health in course-api" loaded `code-qa:api-conventions` without naming it.
- **A lesson from testing:** Claude Code refuses to edit files inside a loaded plugin's folder ("sensitive file"). Here `course-api/` lives inside the plugin repo, so loading the plugin with `--plugin-dir .` blocked `test-writer`. Running the session from a copy of the API outside the plugin folder fixed it. An installed plugin lives in the plugin cache, so the problem does not appear after `/plugin install`.
