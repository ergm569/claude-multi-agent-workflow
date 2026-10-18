---
name: api-conventions
description: Conventions and test template for the Express API in course-api/. Use when adding or changing a route, validating a request body, returning 400/404 errors, or writing a test for an endpoint (for example "add an endpoint", "validate the body", "write a test for POST /users").
---

# API conventions

Rules for the Express API in `course-api/`. They come from `course-api/CLAUDE.md`; follow them when writing code and check against them when reviewing.

## Code

- One route file per resource in `routes/` (`users.js`, `health.js`), each exporting an Express router mounted in `server.js` under its base path.
- All data access goes through `db/store.js`. Routes never hold state themselves.
- Validate input in the route, before calling the store.
- Return `400` on bad input and `404` when the record does not exist.
- Every error response is JSON shaped `{ "error": "message" }`.
- Ids come from the URL as strings: convert them with `Number(req.params.id)` before calling the store.

## Tests

Tests live in `course-api/tests/` and use Node's built-in runner with Supertest. Reset the store before each test so tests never depend on each other. Write one test per status code an endpoint can return.

```js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const store = require('../db/store');

test.beforeEach(() => store.reset());

test('POST /users returns 400 when email is missing', async () => {
  const res = await request(app).post('/users').send({ name: 'Grace Hopper' });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});
```

## Checks

Run from `course-api/`:

- `npm test`: the whole suite must pass.
- `npm run lint`: ESLint must report no errors.
