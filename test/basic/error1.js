var test = require('tape')

test('error1a', function (t) {
  t.ok(true, 'error1a')
  t.end()
})

test('error1b', function (t) {
  throw new Error('error1')
})
