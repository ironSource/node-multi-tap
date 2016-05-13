'use strict';

const multi = require('multistream')
    , through2 = require('through2')
    , spawn = require('cross-spawn-async')
    , path = require('path')
    , existent = require('existent')
    , after = require('after')
    , glob = require('glob')
    , pump = require('pump')
    , parser = require('tap-parser')

const TAPE_COMMENT = /^#\s+(ok|((tests|pass|fail)\s+\d+))\s*$/

module.exports = function run (patterns, opts) {
  patterns = [].concat(patterns)
  opts || (opts = {})

  let id = 0, ok = true, passed = 0, planned = 0, failed = 0;

  const runner = opts.runner || 'node'
      , cwd = path.resolve(opts.cwd || '.')
      , basedir = path.resolve(opts.basedir || '.')
      , files = []
      , output = through2(null, null, flush)

  output.write('TAP version 13\n')

  const next = after(patterns.length, runAll)
  patterns.forEach(collect)

  return output

  function flush(cb) {
    if (planned !== id) this.push(fail('plan != count') + '\n')

    // Emit plan
    this.push('1..' + id + '\n')
    this.push('# tests ' + id + '\n')
    this.push('# pass  ' + passed + '\n')

    if (ok) this.push('\n# ok\n')
    else this.push('# fail  ' + failed + '\n')

    cb()
  }

  function fail(message) {
    ok = false
    planned++
    failed++
    return 'not ok ' + (++id) + ' ' + message
  }

  function collect (pattern) {
    glob(pattern, { cwd: basedir }, function(err, results) {
      if (err) return next(err)

      results.forEach(f => {
        const abs = path.resolve(basedir, f)
        if (!~files.indexOf(abs)) files.push(abs)
      })

      next()
    })
  }

  function runAll (err) {
    if (err) output.destroy(err)
    else pump(multi(files.map(runFile)), output)
  }

  function runFile (file) {
    const lines = through2.obj((line, enc, next) => next(null, line + '\n'))
        , p = parser()
        , name = path.relative(basedir, file)

    process.nextTick(function() {
      const stderr = opts.stderr ? process.stderr : 'ignore'
          , sopts = { stdio: [ 'ignore', 'pipe', stderr ] }
          , ext = path.extname(file)

      if (ext === '.js') {
        sopts.cwd = cwd
        var child = spawn(runner, [file], sopts)
      } else if (ext === '.json' && path.basename(file, ext) === 'package') {
        sopts.cwd = path.dirname(file)
        child = spawn('npm', ['test', '-s'], sopts)
      } else if (existent.sync(path.join(file, 'package.json'))) {
        sopts.cwd = file
        child = spawn('npm', ['test', '-s'], sopts)
      } else {
        return lines.destroy(new Error('Unsupported file: ' + file))
      }

      let hasTests = false;

      child.on('close', function (code) {
        if (hasTests || !code) return lines.end()
        lines.end(fail(name))
      })

      p.on('complete', function (results) {
        let plan = results.plan

        if (!plan) {
          // Error occurred
          plan = { start: 1, end: results.count }
        } else if (results.count) {
          hasTests = true
        }

        if (!results.ok) ok = false
        passed+= results.pass
        failed+= results.count - results.pass
        planned+= plan.end - plan.start + 1
      })

      p.on('assert', function (assertion) {
        const line = String(assertion).replace(assertion.id, ++id).trim()

        if (line.indexOf('\n') > 0) {
          // Hack to add YAML delimiters (is this a bug in tap-parser?)
          lines.write(line.replace(/\n/, '\n  ---\n') + '\n  ...\n')
        } else {
          lines.write(line)
        }
      })

      p.on('comment', function (comment) {
        if (!TAPE_COMMENT.test(comment)) lines.write(comment.trim())
      })

      p.on('bailout', function (reason) {
        lines.write('Bail out! ' + reason)
      })

      p.on('child', function (childParser) {
        // TODO
      })

      p.on('extra', function (line) {
        line = line.trim()
        if (line) lines.write(line)
      })

      child.stdout.pipe(p)
    })

    return lines
  }
}
