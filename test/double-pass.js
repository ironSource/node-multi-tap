'use strict';

const test = require('tape')
    , execFile = require('child_process').execFile
    , resolve = require('path').resolve
    , fs = require('fs')
    , bin = resolve(__dirname, '..', 'lib', 'bin.js')
    , cwd = resolve(__dirname, 'double-pass')

test('double pass', function (t) {
  t.plan(3)

  const expected = fs.readFileSync(resolve(cwd, 'tap.txt'), 'utf8')

  run(['tap.js'], (err, stdout, stderr) => {
    t.is(err && err.code, 1, 'exited with code 1')
    t.is(stdout.trim(), expected.trim(), 'tap ok')
    t.is(stderr, '', 'empty stderr')
  })
})

function run(args, cb) {
  execFile('node', [bin].concat(args), { cwd }, cb)
}
