'use strict';

const test = require('tape')
    , name = process.argv[2] || 'js'

console.error(name)

test('name', function (t) {
  t.ok(true, name)

  if (process.argv[3]) {
    t.ok(false, process.argv[3])
  }

  t.end()
})
