require('tape')('skip1', function (t) {
  t.skip(true, 'test 1')
  t.end()
})
