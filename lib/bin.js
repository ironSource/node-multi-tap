#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2), {
  string: [ 'binary', 'cwd', 'basedir', 'run' ],
  alias: {
    b: 'basedir',
    bin: 'binary',
    r: 'run',
    c: 'cwd',
    e: 'stderr',
    v: 'version',
    f: 'failFast',
    i: 'ignoreMissing',
    h: 'help'
  },
  default: {
    binary: 'node',
    cwd: process.cwd(),
    basedir: process.cwd(),
    // Inherit options from a parent multi-tap process
    stderr: process.env.MULTI_TAP_STDERR,
    ignoreMissing: process.env.MULTI_TAP_IGNORE_MISSING,
    failFast: process.env.MULTI_TAP_FAIL_FAST
  }
})

if (argv.version) {
  console.log('multi-tap', require('../package.json').version)
  process.exit()
}

if (argv.help) {
  const usage = require('fs').readFileSync(__dirname + '/usage.txt', 'utf8')
  console.log(usage)
  process.exit()
}

let exitCode = 0

const opts = {
  cwd           : argv.cwd,
  basedir       : argv.basedir,
  binary        : argv.binary,
  run           : argv.run,
  stderr        : isTrue(argv.stderr),
  failFast      : argv['fail-fast'] || isTrue(argv.failFast),
  ignoreMissing : argv['ignore-missing'] || isTrue(argv.ignoreMissing)
}

require('./index.js')(argv._, opts)
  .on('close-child', remember)
  .on('complete', complete)
  .on('end', end)
  .pipe(process.stdout)

function remember (code) {
  exitCode = code || exitCode
}

function complete (ok) {
  exitCode = exitCode || (ok ? 0 : 1)
}

function end () {
  process.exit(exitCode)
}

function isTrue (s) {
  if (typeof s === 'string') {
    return s.toLowerCase() === 'true' || s === '1'
  } else {
    return !!s
  }
}
