'use strict';

const multi = require('multistream')
    , through2 = require('through2')
    , spawn = require('cross-spawn')
    , path = require('path')
    , existent = require('existent')
    , after = require('after')
    , glob = require('glob')
    , pump = require('pump')
    , parser = require('tap-parser')
    , fs = require('fs')
    , xtend = require('xtend')
    , commonPrefix = require('common-prefix')
    , mm = require('micromatch')
    , debug = require('debug')('multi-tap')
    , yaml = require('js-yaml')
    , assertPattern = assertString('pattern')
    , assertRun = assertString('options.run')
    , noop = function () {}

const TAPE_COMMENT = /^#\s+(ok|((tests|pass|fail)\s+\d+))\s*$/
    , SCRIPT_NS_SEP = /[:\/\\]+/g
    , SEP = ' › '

module.exports = function run (patterns, opts) {
  patterns = [].concat(patterns || []).map(assertPattern)
  opts || (opts = {})

  // Default to package in working directory
  if (!patterns.length) patterns.push('.')

  let id = 0, ok = true, passed = 0, planned = 0, failed = 0;

  const binary = opts.binary || 'node'
      , scriptPatterns = [].concat(opts.run || 'test').map(assertRun)
      , cwd = path.resolve(opts.cwd || '.')
      , basedir = path.resolve(opts.basedir || '.')
      , files = []
      , output = through2(null, null, flush)

  // TODO: rename this option to `verbose`
  const warn = opts.stderr ? console.error.bind(console) : noop

  // Have child processes inherit our options
  const env = xtend(process.env, {
    MULTI_TAP_STDERR: String(!!opts.stderr),
    MULTI_TAP_IGNORE_MISSING: String(!!opts.ignoreMissing),
    MULTI_TAP_FAIL_FAST: String(!!opts.failFast)
  })

  // Write header
  output.write('TAP version 13\n')

  // Resolve glob patterns
  const next = after(patterns.length, runAll)
  patterns.forEach(collect)

  return output

  function flush (cb) {
    if (planned !== id) this.push(fail('plan != count') + '\n')

    // Emit plan
    this.push(`1..${id}\n`)
    this.push(`# tests ${id}\n`)
    this.push(`# pass  ${passed}\n`)

    if (ok && !failed) {
      this.push('\n# ok\n')
      output.emit('complete', true)
    } else {
      this.push(`# fail  ${failed}\n`)
      output.emit('complete', false)
    }

    cb()
  }

  function increment (pass) {
    planned++

    if (pass) passed++
    else failed++

    return ++id
  }

  function fail (message) {
    return `not ok ${increment(false)} ${message.trim()}`
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
    if (err) return output.destroy(err)

    const streams = new Array(files.length)
    const scriptMatchers = createScriptMatchers(scriptPatterns)

    const next = after(files.length, (err) => {
      if (err) return output.destroy(err)
      const flat = streams.reduce((a, el) => a.concat(el), [])
      pump(new multi(flat), output)
    })

    files.forEach((file, index) => {
      const ext = path.extname(file)

      if (ext === '.js') {
        var type = 'binary'
      } else if (ext === '.json' && path.basename(file, ext) === 'package') {
        file = path.dirname(file)
        type = 'npm'
      } else if (existent.sync(path.join(file, 'package.json'))) {
        type = 'npm'
      } else {
        return next(new Error(`Unsupported file type: ${file}`))
      }

      const name = path.relative(basedir, file)

      if (type === 'binary') {
        streams[index] = runFile.bind(null, type, null, file, name)
        next()
      } else {
        fs.readFile(path.join(file, 'package.json'), 'utf8', (err, json) => {
          if (err) return next(err)

          try {
            var pkg = JSON.parse(json)
          } catch (err) {
            return next(err)
          }

          // Match --run patterns to script names
          const scripts = (pkg && pkg.scripts) || {}
              , scriptNames = Object.keys(scripts)
              , matches = new Set
              , unmatched = new Set(scriptPatterns)
              , packageName = pkg && pkg.name

          // Queue in the order they were defined
          for(let i = 0; i < scriptMatchers.length; i++) {
            const match = scriptMatchers[i]

            for(let name of scriptNames) {
              if (match(name)) {
                unmatched.delete(scriptPatterns[i])
                matches.add(name)
              }
            }
          }

          const run = Array.from(matches)
              , strip = commonPrefix(run).length

          streams[index] = run.map(script => {
            const subtitle = script.slice(strip)

            if (isEmptyCommand(scripts[script])) {
              const msg = `undefined, empty or invalid npm script "${script}"`
              const prefix = testPrefix(name, packageName, subtitle)

              debug(msg)
              return missing.bind(null, prefix, msg)
            } else {
              const prefix = testPrefix(name, packageName, subtitle)
              return runFile.bind(null, type, script, file, name, prefix)
            }
          })

          if (unmatched.size) {
            const ptn = Array.from(unmatched).map(p => JSON.stringify(p)).join(', ')
            const msg = `no npm script(s) matching ${ptn}`
            const prefix = testPrefix(name, packageName, '')

            debug(msg)
            streams[index].push(missing.bind(null, prefix, msg))
          }

          next()
        })
      }
    })
  }

  function missing (prefix, msg) {
    const lines = lineWriter()

    // Do nothing if earlier test failed
    if (!opts.failFast || !failed) {
      const operator = opts.ignoreMissing ? 'ok' : 'not ok'
      const directive = opts.ignoreMissing ? 'skip' : 'TODO'
      const id = increment(opts.ignoreMissing)

      lines.write(`# ${prefix}-`)
      lines.write(`${operator} ${id} # ${directive} ${msg}`)
    }

    process.nextTick(() => lines.end())
    return lines
  }

  function runFile (type, script, file, name, prefix) {
    const lines = lineWriter()
        , p = new parser()

    process.nextTick(function() {
      const stderr = opts.stderr ? process.stderr : 'ignore'
          , sopts = { stdio: [ 'ignore', 'pipe', stderr ], env }

      if (type === 'binary') {
        debug('spawn %s %s', binary, file)
        sopts.cwd = cwd
        var child = spawn(binary, [file], sopts)
      } else if (type === 'npm') {
        debug('spawn npm run %s', script)
        sopts.cwd = file
        child = spawn('npm', ['run', '-s', '--no-progress', script], sopts)
      } else {
        throw new Error('Unexpected type: ' + type)
      }

      let hadTests = false;

      child.on('close', function (code) {
        output.emit('close-child', code)

        if (code) {
          if (!hadTests || failed === 0) {
            lines.write(fail(`${name} exited with code ${code}`))
          }

          if (opts.failFast) return output.end()
        }

        lines.end()
      })

      p.on('complete', function (results) {
        let plan = results.plan

        if (!plan) {
          // Error occurred
          plan = { start: 1, end: results.count }
        } else if (results.count) {
          hadTests = true
        }

        if (!results.ok) ok = false

        passed+= results.pass
        failed+= results.count - results.pass
        planned+= plan.end - plan.start + 1
      })

      p.on('assert', function (assertion) {
        let line = (assertion.ok ? 'ok': 'not ok') + ' ' + (++id)

        if (assertion.name) line+= ' ' + assertion.name

        // Add directives with optional message
        if (assertion.skip === true) line+= ' # skip'
        else if (assertion.skip) line+= ' # skip ' + assertion.skip

        if (assertion.todo === true) line+= ' # todo'
        else if (assertion.todo) line+= ' # todo ' + assertion.todo

        lines.write(line)

        // Add YAML block
        if (assertion.diag) {
          const diag = yaml.safeDump(assertion.diag).trim()
          const indented = diag.replace(/^|\n/g, '\n    ')

          lines.write('  ---' + indented + '\n  ...\n')
        }
      })

      p.on('comment', function (comment) {
        comment = comment.trim()

        if (!TAPE_COMMENT.test(comment)) {
          if (prefix) comment = comment.replace(/^# ?/, `# ${prefix}`)
          lines.write(comment)
        }
      })

      p.on('bailout', function (reason) {
        lines.write('Bail out! ' + reason)
      })

      p.on('child', function (childParser) {
        warn('nested tap tests are not supported yet')
      })

      p.on('extra', function (line) {
        if (line.trim()) lines.write(line)
      })

      child.stdout.pipe(p)
    })

    return lines
  }
}

function lineWriter () {
  return through2.obj((line, enc, next) => next(null, line + '\n'))
}

function isEmptyCommand (command) {
  if (typeof command !== 'string') return true

  command = command.trim()

  // Treat the default npm test script as empty
  return !command || command === 'echo \"Error: no test specified\" && exit 1'
}

function assertString (name) {
  return function assert (str) {
    if (typeof str !== 'string') {
      throw new TypeError(name + ' must be a string')
    }

    return str
  }
}

function testPrefix (relative, packageName, subtitle) {
  const prefix = []

  // Only include name if package is not in cwd
  if (relative) prefix.push(packageName || relative)
  if (subtitle) prefix.push(subtitle)

  return prefix.length ? prefix.join(SEP) + SEP : ''
}

function pathify (script) {
  return script.replace(SCRIPT_NS_SEP, '/')
}

function createScriptMatchers (patterns) {
  const opts = { unixify: false, dot: true }

  return patterns.map(pattern => {
    const path = pathify(pattern)
    const isMatch = mm.matcher(path, opts)

    return function matchScript (name) {
      const path = pathify(name)

      return isMatch(path) === true
    }
  })
}
