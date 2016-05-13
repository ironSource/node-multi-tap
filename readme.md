# multi-tap

**Spawn concurrent tests and merge [tap protocol](https://testanything.org/tap-version-13-specification.html) output. Works with JavaScript entries (spawns `node file.js` by default), `package.json` files or directories containing a `package.json` (spawns `npm test -s`).**

[![npm status](http://img.shields.io/npm/v/multi-tap.svg?style=flat-square)](https://www.npmjs.org/package/multi-tap) [![node](https://img.shields.io/node/v/multi-tap.svg?style=flat-square)](https://www.npmjs.org/package/multi-tap)

## example

Let's say we have a monorepo with a bunch of packages with self-contained tests, as well as functional tests at the root of the monorepo:

`test-functional.js`

```js
require('tape')('monorepo', function (t) {
  t.ok(true, 'beep')
  t.end()
})
```

`packages/my-package/package.json`

```json
{
  "name": "my-package",
  "scripts": {
    "test": "node my-test.js"
  }
}
```

`packages/my-package/my-test.js`

```js
require('tape')('my-package', function (t) {
  t.equal(2, 3)
  t.end()
})
```

```
> multi-tap test-*.js packages/*
TAP version 13
# monorepo
ok 1 beep
# my-package                    
not ok 2 should be equal
  ---
    operator: equal
    expected: 3
    actual:   2
  ...

1..2
# tests 2
# pass  1
# fail  1
```

## `multi-tap [options] pattern(s)`

Spawn `npm test -s` for `lib/packages/one` and `lib/packages/two`, pipe the merged output to the [tap-spec](https://www.npmjs.com/package/tap-spec) reporter:

```bash
multi-tap --basedir lib/packages one two | tap-spec
```

Spawn `beep file.js` in working directory `/tmp` for each file in `test`:

```bash
multi-tap --runner beep --cwd /tmp test/*.js
```

## `multitap(pattern(s), [options])`

```js
const multi = require('multi-tap')

multi(['test.js', '*/package', '*/package.json'])
  .pipe(process.stdout)
```

## options

These options are available for both the CLI and API:

- **runner**: command for JS entries, defaults to `node`, has no effect on package entries
- **basedir**: resolve patterns from this path, defaults to `process.cwd()`;
- **cwd**: working directory for JS entry runners, defaults to `process.cwd()`, has no effect on package entries;
- **stderr**: inherit `stderr`.

Unix note: if your shell performs glob expansion but you want to resolve glob patterns from `basedir`, quote or escape the pattern(s) so that `multi-tap` performs the glob expansion instead:

```bash
# a.js, b.js
multi-tap --basedir lib *.js

# lib/a.js, lib/b.js
multi-tap --basedir lib \*.js
```

## install

With [npm](https://npmjs.org) do:

```
npm install multi-tap
```

## license

[MIT](http://opensource.org/licenses/MIT) © [ironSource](http://www.ironsrc.com/).
