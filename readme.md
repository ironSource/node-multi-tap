# multi-tap

**Spawn and merge [tap-producing](https://testanything.org/tap-version-13-specification.html) tests. Accepts JavaScript entries (spawns node by default), `package.json` files or directories containing a `package.json` (spawns `npm run test` by default). Can run multiple test scripts per package, with glob pattern support.**

[![npm status](http://img.shields.io/npm/v/multi-tap.svg?style=flat-square)](https://www.npmjs.org/package/multi-tap) [![node](https://img.shields.io/node/v/multi-tap.svg?style=flat-square)](https://www.npmjs.org/package/multi-tap)

## example

Let's say we have a monorepo with a bunch of packages with self-contained tests, as well as functional tests at the root of the monorepo:

`test.js`

```js
require('tape')('monorepo', function (t) {
  t.ok(true, 'beep')
  t.end()
})
```

`packages/has-window/index.js`

```js
module.exports = function hasWindow () {
  return typeof window !== 'undefined'
}
```

`packages/has-window/test.js`

```js
const test = require('tape')
    , hasWindow = require('.')

test('return value', function (t) {
  const expected = !!process.browser
  t.is(hasWindow(), expected, 'value is ' + expected)
  t.end()
})
```

`packages/has-window/package.json`

```json
{
  "name": "has-window",
  "scripts": {
    "test:node": "node test.js",
    "test:browser": "browserify test.js | smokestack",
    "test": "multi-tap -r test:*"
  }
}
```

With `multi-tap`, we can run all three test suites:

```
> multi-tap test-*.js packages/*
TAP version 13
# monorepo
ok 1 beep
# has-window › browser › return value            
ok 2 value is true
# has-window › node › return value                    
ok 3 value is false
1..3
# tests 3
# pass  3

# ok
```

## `multi-tap [options] [pattern(s)]`

```
Options

 --run            -r  npm script(s) to run ("test")
 --ignore-missing -i  don't fail on missing npm scripts (false)
 --basedir        -b  resolve patterns from this path (cwd)
 --cwd            -c  working directory for js entries (cwd)
 --binary      --bin  command for js entries ("node")
 --stderr         -e  inherit standard error (false)
 --fail-fast      -f  if a test fails, cancel subsequent tests (false)
 --version        -v  print multi-tap version and exit
```

Spawn `npm test` for `packages/one` and `packages/two`, pipe the merged output to the [tap-spec](https://www.npmjs.com/package/tap-spec) reporter:

```bash
multi-tap packages/{one,two} | tap-spec
```

Spawn `beep <file>` in working directory `/tmp` for each file in `test`:

```bash
multi-tap --bin beep --cwd /tmp test/*.js
```

Spawn two npm scripts in the current directory:

```bash
multi-tap -r test-node -r test-chrome
```

Short options can be joined together. This runs the test suites of `modules/middleware-*`, fast failing, showing stderr, and ignoring packages without a `test` script:

```bash
multi-tap middleware-* -efib modules | faucet
```

## `multitap([pattern(s)], [options])`

```js
const multi = require('multi-tap')

multi(['modules/*'])
  .pipe(process.stdout)
```

## options

These options are available for both the CLI and API:

- **basedir**: resolve patterns from this path, defaults to `process.cwd()`
- **stderr**: inherit standard error (false)
- **failFast**: if a test fails, cancel subsequent tests (false)

Additional options that only apply to packages:

- **run**: npm script(s) to run ("test")
- **ignoreMissing**: don't fail on missing npm scripts. Adds a passing assertion with a `skip` directive. Default behavior is to add a failing assertion with a `TODO` directive.

Additional options that only apply to js entries:

- **cwd**: working directory, defaults to `process.cwd()`
- **binary**: command to run, defaults to `node`

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

## changelog

### 1.0.0

- Run tests in series
- Rename `--runner/-r` to `--binary/--bin`
- Add `--run/-r` to specify npm script(s) with glob support
- Check if npm script(s) are defined before spawning
- Add `--fail-fast/-f` option
- Prefix TAP comments with package name and npm script

## license

[MIT](http://opensource.org/licenses/MIT) © [ironSource](http://www.ironsrc.com/).
