'use strict';

const file = require('path').join(__dirname, 'tap.txt')
console.log(require('fs').readFileSync(file, 'utf8'))
