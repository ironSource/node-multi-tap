'use strict';

const test = require('tape')
    , concat = require('concat-stream')
    , fs = require('fs')
    , path = require('path')
    , removeStackTrace = require('./util/remove-stack-trace')
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
  const expected = template(`${tests.join('+')}.txt`)

  multi(tests.map(t => `${t}.js`), { basedir: __dirname + '/basic' })
    .pipe(concat(function (output) {
      t.equal(removeStackTrace(String(output)).trim(), expected.trim())
    }))
}

function template(file) {
  const dir = path.join(__dirname, 'basic')
  const tpl = fs.readFileSync(path.join(dir, file), 'utf8')

  return tpl.replace(/\$\{dir\}/g, dir + path.sep)
}
