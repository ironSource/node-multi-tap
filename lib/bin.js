#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2), {
  string: [ 'runner', 'cwd', 'basedir' ],
  alias: {
    b: 'basedir',
    r: 'runner',
    c: 'cwd',
    e: 'stderr',
    v: 'version',
    h: 'help'
  },
  default: {
    runner: 'node',
    cwd: process.cwd(),
    basedir: process.cwd()
  }
})

const runner = argv.runner
    , cwd = argv.cwd
    , basedir = argv.basedir
    , stderr = !!argv.stderr
    , patterns = argv._

if (argv.version) {
  console.log('multi-tap', require('../package.json').version)
  process.exit()
}

if (argv.help || !patterns.length) {
  const usage = require('fs').readFileSync(__dirname + '/usage.txt', 'utf8')
  console.log(usage)
  process.exit()
}

require('./index.js')(patterns, { cwd, basedir, runner, stderr })
  .pipe(process.stdout)
