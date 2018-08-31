'use strict'

module.exports = function (tapOutput) {
  return tapOutput.replace(/  stack: \|-[\S\s]*\.\.\./, '...')
}
