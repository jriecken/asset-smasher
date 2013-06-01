/**
 *
 * This transformer takes Dust .dust templates and compiles them to a form
 * usable by dust.render on the client-side.
 *
 * The name of the template to pass to dust.render will be the file's
 * logical path, minus the ".js.dust" extension.
 *
 */
var path = require('path');
var dust;

var DustTransform = module.exports = function DustTransform(options) {
  this.options = options || {};
};
DustTransform.prototype = {
  extensions:function () {
    return ['.dust'];
  },
  shouldTransform:function (fileName, asset) {
    return path.extname(fileName) === '.dust';
  },
  transformedFileName:function (fileName, asset) {
    return path.basename(fileName, '.dust');
  },
  transform:function (asset, cb) {
    // Load dust if necessary
    if (!dust) {
      try {
        dust = require('dustjs-linkedin');
      } catch (e) {
        try {
          dust = require('dust');
        } catch (e2) {
          cb(new Error('dust could not be found'));
        }
      }
    }
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName, asset);
    // Compute the name for the template (logical name minus the .dust/.js)
    var logicalPath = asset.logicalPath;
    var templateName = path.join(path.dirname(logicalPath), path.basename(logicalPath, '.js'));
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Compile the contents
    try {
      asset.contents = dust.compile(contents, templateName);
      cb();
    } catch (e) {
      cb(e);
    }
  }
};