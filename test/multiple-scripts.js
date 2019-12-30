'use strict';

const test = require('tape')
    , execFile = require('child_process').execFile
    , resolve = require('path').resolve
    , concat = require('concat-stream')
    , removeStackTrace = require('./util/remove-stack-trace')
    , bin = resolve(__dirname, '..', 'lib', 'bin.js')
    , cwd = resolve(__dirname, 'multiple-scripts')
    , filename = resolve(cwd, 'test.js')

test('-r test', function (t) {
  t.plan(3)

  run(['-r', 'test'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')
    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 test',
      '1..1',
      '# tests 1',
      '# pass  1',
      '',
      '# ok'
    ], 1), 'tap ok')
    t.is(stderr, '', 'empty stderr')
  })
})

test('defaults to -r test', function (t) {
  t.plan(3)

  run([], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')
    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 test',
      '1..1',
      '# tests 1',
      '# pass  1',
      '',
      '# ok'
    ]), 'tap ok')
    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test -r test:a', function (t) {
  t.plan(3)

  run(['-r', 'test', '-r', 'test:a'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 test',
      '# :a › name',
      'ok 2 test:a',
      '1..2',
      '# tests 2',
      '# pass  2',
      '',
      '# ok'
    ], 2), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test:a -r test:b', function (t) {
  t.plan(3)

  run(['-r', 'test:a', '-r', 'test:b'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# a › name',
      'ok 1 test:a',
      '# b › name',
      'ok 2 test:b',
      '1..2',
      '# tests 2',
      '# pass  2',
      '',
      '# ok'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test:*', function (t) {
  t.plan(3)

  run(['-r', 'test:*'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# a › name',
      'ok 1 test:a',
      '# b › name',
      'ok 2 test:b',
      '1..2',
      '# tests 2',
      '# pass  2',
      '',
      '# ok'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r deep:a:*', function (t) {
  t.plan(3)

  run(['-r', 'deep:a:*'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')
    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 deep:a:b',
      '1..1',
      '# tests 1',
      '# pass  1',
      '',
      '# ok'
    ]), 'tap ok')
    t.is(stderr, '', 'empty stderr')
  })
})

test('-r deep:a:**', function (t) {
  t.plan(3)

  run(['-r', 'deep:a:**'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 deep:a:b',
      '# :c › name',
      'ok 2 deep:a:b:c',
      '1..2',
      '# tests 2',
      '# pass  2',
      '',
      '# ok'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r deep:a:** with js', function (t) {
  t.plan(3)

  run(['-r', 'deep:a:**', '.', 'test.js'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 deep:a:b',
      '# :c › name',
      'ok 2 deep:a:b:c',
      '# name',
      'ok 3 js',
      '1..3',
      '# tests 3',
      '# pass  3',
      '',
      '# ok'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r non-existent --ignore-missing', function (t) {
  t.plan(3)

  run(['-r', 'non-existent', '--ignore-missing'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# -',
      'ok 1 # skip no npm script(s) matching "non-existent"',
      '1..1',
      '# tests 1',
      '# pass  1',
      '',
      '# ok'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r non-existent', function (t) {
  t.plan(3)

  run(['-r', 'non-existent'], (err, stdout, stderr) => {
    t.is(err && err.code, 1, 'exited with code 1')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# -',
      'not ok 1 # TODO no npm script(s) matching "non-existent"',
      '1..1',
      '# tests 1',
      '# pass  0',
      '# fail  1',
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test -r non-existent', function (t) {
  t.plan(3)

  run(['-r', 'test', '-r', 'non-existent'], (err, stdout, stderr) => {
    t.is(err && err.code, 1, 'exited with code 1')

    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 test',
      '# -',
      'not ok 2 # TODO no npm script(s) matching "non-existent"',
      '1..2',
      '# tests 2',
      '# pass  1',
      '# fail  1'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r {test,non-existent}', function (t) {
  t.plan(3)

  run(['-r', '{test,non-existent}'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')
    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 test',
      '1..1',
      '# tests 1',
      '# pass  1',
      '',
      '# ok'
    ]), 'tap ok')
    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test --stderr', function (t) {
  t.plan(3)

  run(['-r', 'test', '--stderr'], (err, stdout, stderr) => {
    t.ifError(err, 'no exec error')
    t.is(stdout.trim(), join([
      'TAP version 13',
      '# name',
      'ok 1 test',
      '1..1',
      '# tests 1',
      '# pass  1',
      '',
      '# ok'
    ]), 'tap ok')
    t.is(stderr, 'test\n', 'stderr ok')
  })
})

test('-r fail', function (t) {
  t.plan(3)

  run(['-r', 'fail'], (err, stdout, stderr) => {
    t.is(err && err.code, 1, 'exited with code 1')

    // console.error('---\n' + stdout + '\n---')

    t.is(removeStackTrace(stdout.trim()), join([
      'TAP version 13',
      '# name',
      'ok 1 fail',
      'not ok 2 fail',
      '  ---',
      '    operator: ok',
      '    expected: true',
      '    actual: false',
      `    at: >-`,
      `      Test.<anonymous>`,
      `      (${filename}:12:7)`,
      '  ...',
      '',
      '# failed 1 of 2 tests',
      '1..2',
      '# tests 2',
      '# pass  1',
      '# fail  1'
    ]), 'tap ok')
    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test:a -r fail -r test:b', function (t) {
  t.plan(3)

  run(['-r', 'test:a', '-r', 'fail', '-r', 'test:b'], (err, stdout, stderr) => {
    t.is(err && err.code, 1, 'exited with code 1')

    // console.error('---\n' + stdout + '\n---')

    t.is(removeStackTrace(stdout.trim()), join([
      'TAP version 13',
      '# test:a › name',
      'ok 1 test:a',
      '# fail › name',
      'ok 2 fail',
      'not ok 3 fail',
      '  ---',
      '    operator: ok',
      '    expected: true',
      '    actual: false',
      `    at: >-`,
      `      Test.<anonymous>`,
      `      (${filename}:12:7)`,
      '  ...',
      '',
      '# fail › failed 1 of 2 tests',
      '# test:b › name',
      'ok 4 test:b',
      '1..4',
      '# tests 4',
      '# pass  3',
      '# fail  1'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

test('-r test:a -r fail -r test:b --fail-fast', function (t) {
  t.plan(3)

  run(['-r', 'test:a', '-r', 'fail', '-r', 'test:b', '--fail-fast'], (err, stdout, stderr) => {
    t.is(err && err.code, 1, 'exited with code 1')

    // console.error('---\n' + stdout + '\n---')

    t.is(removeStackTrace(stdout.trim()), join([
      'TAP version 13',
      '# test:a › name',
      'ok 1 test:a',
      '# fail › name',
      'ok 2 fail',
      'not ok 3 fail',
      '  ---',
      '    operator: ok',
      '    expected: true',
      '    actual: false',
      `    at: >-`,
      `      Test.<anonymous>`,
      `      (${filename}:12:7)`,
      '  ...',
      '',
      '# fail › failed 1 of 2 tests',
      '1..3',
      '# tests 3',
      '# pass  2',
      '# fail  1'
    ]), 'tap ok')

    t.is(stderr, '', 'empty stderr')
  })
})

function run(args, cb) {
  execFile('node', [bin].concat(args), { cwd }, cb)
}


function join(lines) {
  return lines.join('\n');
}
