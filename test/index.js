'use strict';

const test = require('tape')
    , concat = require('concat-stream')
    , fs = require('fs')
    , multi = require('../')

test('passing', function (t) {
  t.plan(1)
  run(['ok1', 'ok2'], t)
})

test('failing', function (t) {
  t.plan(1)
  run(['ok1', 'fail1'], t)
})

test('skip assertion', function (t) {
  t.plan(1)
  run(['ok2', 'skip1'], t)
})

test('skip test', function (t) {
  t.plan(1)
  run(['ok2', 'skip2'], t)
})

test('error after passing test', function (t) {
  t.plan(1)
  run(['ok1', 'ok2', 'error1'], t)
})

test('error', function (t) {
  t.plan(1)
  run(['ok1', 'ok2', 'error2'], t)
})

function run(tests, t) {
  const path = `${__dirname}/fixtures/${tests.join('+')}.txt`
  const expected = fs.readFileSync(path, 'utf8')

  multi(tests.map(t => `${t}.js`), { basedir: __dirname + '/fixtures' })
    .pipe(concat(function (output) {
      t.equal(String(output), expected)
    }))
}
