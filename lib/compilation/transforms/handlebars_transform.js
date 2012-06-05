/**
 *
 * This transformer takes Handlebars .hbs templates and compiles them to a form
 * usable on the client-side.
 *
 * The name of the template to pass to dust.render will be the file's
 * logical path, minus the ".js.hbs" extension.
 *
 */
var path = require('path');
var handlebars;

var HandlebarsTransform = module.exports = function HandlebarsTransform(options) {
  this.options = options || {};
};
HandlebarsTransform.prototype = {
  extensions:function () {
    return ['.hbs'];
  },
  shouldTransform:function (file) {
    return path.extname(file) === '.hbs';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.hbs');
  },
  transform:function (asset, cb) {
    // Load handlebars if necessary
    if (!handlebars) {
      try {
        handlebars = require('handlebars');
      } catch (e) {
        cb(new Error('handlebars could not be found'));
      }
    }
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName);
    // Compute the name for the template (logical name minus the .hbs/.js)
    var logicalPath = asset.logicalPath;
    var templateName = path.join(path.dirname(logicalPath), path.basename(logicalPath, '.js'));
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Compile the contents
    try {
      var newContents = '(function() {\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n';
      newContents += '  templates[\''+templateName+'\'] = template(' + handlebars.precompile(contents, {}) + ');\n';
      newContents += '})();';
      asset.contents = newContents;
      cb();
    } catch (e) {
      cb(e);
    }
  }
};