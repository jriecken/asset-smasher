exports.version = require('../package.json').version;
exports.transforms = require('./compilation/transformer').transforms;
exports.postTransforms = require('./compilation/transformer').postTransforms;
exports.Snassets = require('./snassets').Snassets;