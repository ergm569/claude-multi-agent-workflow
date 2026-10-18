# code-qa

Code quality kit: review changes, write the missing tests and lint after every edit.

A Claude Code plugin that bundles a multi-agent code quality workflow. It is built and tested against the Express API in `course-api/`.

## What it adds

| Component | Name | What it does |
|-----------|------|--------------|
| Command | `/code-qa:qa [files or branch]` | Runs the whole workflow: reviews code and test coverage in parallel, then writes the missing tests and reports what changed. |
| Subagent | `code-qa:code-reviewer` | Read-only reviewer (`Read`, `Grep`, `Glob`; `sonnet`). Reports bugs and convention breaks by severity, or lists the endpoints and status codes without tests. |
| Subagent | `code-qa:test-writer` | Writes tests in `course-api/tests/` and runs `npm test` (`Read`, `Grep`, `Glob`, `Write`, `Edit`, `Bash`; `haiku`). Never changes the API code. |
| Skill | `code-qa:api-conventions` | The API's conventions and test template. Loads when you add or change routes, validation or tests, and both subagents preload it. |
| Hook | `PostToolUse` on `Write\|Edit` | Runs ESLint on every JavaScript file Claude writes or edits and sends the errors back so they get fixed right away. |

## Workflow

```
/code-qa:qa
  1. Scope            changed files under course-api/ (or the given files/branch)
  2. In parallel      code-reviewer (code) · code-reviewer (coverage) · baseline npm test + lint
  3. Then             test-writer writes the missing tests and runs npm test
  4. Then             report: findings, tests added, before → after, bugs exposed
```

## Structure

```
.
├── .claude-plugin/
│   └── plugin.json        # manifest: name, version, description, author
├── agents/
│   ├── code-reviewer.md
│   └── test-writer.md
├── commands/
│   └── qa.md
├── skills/
│   └── api-conventions/SKILL.md
├── hooks/
│   └── hooks.json         # runs scripts/lint-edited.js via ${CLAUDE_PLUGIN_ROOT}
├── scripts/
│   └── lint-edited.js
├── course-api/            # Express API used to test the plugin
└── README.md
```

## Install

This repo is also the marketplace that offers the plugin. Inside Claude Code:

```
/plugin marketplace add ergm569/claude-multi-agent-workflow
/plugin install code-qa@code-qa-marketplace
```

## Usage

Open Claude Code in a project that contains the API in `course-api/` and run:

```
/code-qa:qa                 # review what changed, or the whole API if nothing did
/code-qa:qa routes/users.js # limit the run to some files
```

To try changes to the plugin without installing it, load it from a checkout:

```bash
claude --plugin-dir path/to/claude-multi-agent-workflow
```

Run it from a copy of the project outside the plugin folder: Claude Code treats files inside a loaded plugin's folder as sensitive and refuses to edit them, so `test-writer` cannot write to `course-api/tests/` when the plugin is loaded from this same repo. Use `/reload-plugins` after editing a component.
