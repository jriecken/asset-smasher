# Asset Smasher

Asset pre-processor, merger, and compressor for Node.js

- [Structuring Your Assets](#structure-assets)
    - [Manifest Files](#manifest-files)
    - [Manifest Directories](#manifest-directories)
- [Using via Command Line](#command-line)
    - [Helpers](#cli-helpers)
    - [Plugins](#cli-plugins)
- [Using via Express Middleware](#express-middleware)
- [Using via Programmatic Interface](#programmatic-interface)
- [Transformer Notes](#transformer-notes)
    - [LESS/Stylus](#tn-less-styl)
    - [ejs](#tn-ejs)
    - [dust and Handlebars](#tn-dust-hbs)

## Overview

Asset Smasher is a command-line tool, express middleware, and programmatic interface for:

- Pre-processing and transforming files down to plain JavaScript and CSS.
    - `.coffee` - Compile CoffeeScript into JavaScript
    - `.ejs` - Run a file through EJS (e.g. to populate configuration parameters into a JavaScript file)
    - `.less` - Compile Less into CSS
    - `.styl` - Compile Stylus into CSS
    - `.hbs` - Precompile Handlebars templates into JavaScript files that register them with `Handlebars.templates`.
    - `.dust` - Precompile Dust templates into JavaScript files that register them for use with `dust.render`.
    - Processors can be chained together.  E.g `test.js.hbs.ejs` (run Handlebars template through EJS, then compile it)
    - Additional processors can be plugged in.
- Merging files together using Manifest files (`.mf`) with dependency management directives similar to Sprockets.
    - `require` - Require a single file
    - `require_dir` - Require all the files in a specific directory
    - `require_tree` - Require all the files in a specific directory (and subdirectories)
- Compressing, gzipping, and generating hashed file names.
    - Compress JavaScript files with `uglify-js`
    - Compress CSS files with `ycssmin`
    - Generate Gzipped versions of files
    - Include a MD5 hash of the file's contents in the file name. `myAsset.js` -> `myAsset-c89cba7b7df028e65cb01d86f4d27077.js`
        - `asset_path` helper that can be used to reference the hashed name.

It's released under the [MIT](http://en.wikipedia.org/wiki/MIT_License) license.

## <a name="structure-assets"></a> Structuring Your Assets

Asset Smasher has the concept of "asset paths".  These are locations in which your asset files will be located, and from which any relative asset paths will be rooted to.

The simplest structure has one asset path.

E.g.

    Asset Paths
    -----------
     - app

    File Structure
    --------------
    app/
      js/
      css/
      images/

A more complicated structure might be

    Asset Paths
    -----------
     - app
     - lib
     - vendor

    File Structure
    --------------
    app/
      js/
      css/
      images/
    lib/
      js/
      css/
      images/
    vendor/
      js/
      css/
      images/

Both of these examples will result in a compiled structure of

    js/
    css/
    images/

### <a name="manifest-files"></a> Manifest Files

Manifest (`.mf`) files are used to merge many assets into a single resulting file. The file should be named with the resulting file type before the `.mf` extension (e.g. `manifest.css.mf` or `manifest.js.mf`. *Manifest files can `require` other manifest files*

A simple manifest file might look like

    # A comment here
    require "./one.js"
    require_dir "./subdir1"
    #
    # Another comment
    require_tree "./subdir2"

**Directives:**

<table border="1" cellpadding="5" cellspacing="0" width="100%">
 <thead>
  <tr><th width="15%">Directive</th><th width="85%">Description</th></tr>
 </thead>
 <tbody>
  <tr>
    <td><code>require "[path]"</code></td>
    <td>
      <strong>Include a single file</strong>
      <ul>
       <li>
         If the path starts with <code>"/"</code>, <code>"../"</code>, or <code>"./"</code>, process and include the specified file.  The file <em>must</em> be
         inside one of the configured asset paths.
       </li>
       <li>
         If the path does not start with <code>"/"</code>, <code>"../"</code>, or <code>"./"</code>, the file will be searched for in all of the configured
         asset paths.  E.g. if there are asset paths <code>one</code> and <code>two</code> defined, <code>require "js/test.js"</code>
         will look for <code>one/js/test.js</code> and then <code>two/js/test.js</code> stopping when it finds a matching file.
       </li>
       <li>
         The filename part of the path does not have to include the whole extension.  E.g <code>require "test"</code>
         finds the first file that matches the name in the asset paths (for example <code>test.js.ejs</code>)
       </li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><code>require_dir "[path]"</code></td>
    <td>
      <strong>Include all the files in a directory</strong>
      <ul>
       <li>
         The path must be absolute, or relative to the current directory.  E.g. you can do <code>require_dir "../some/other/dir"</code>
         but not <code>require_dir "somedir"</code>
       </li>
       <li>
         If using absolute paths, or <code>".."</code> in your paths, the resulting directory needs to be inside one of the configured asset paths.
       </li>
       <li>
         Make sure the directory only contains assets of the type you want.  E.g. for <code>myManifest.js.mf</code>, the dir required had better
         only contain javascript files, or else bad things will happen.
       </li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><code>require_tree "[path]"</code></td>
    <td>
      <strong>Include the files in a directory recursively</strong>
      <ul>
        <li>The rules for <code>require_tree</code> are the same as the rules for <code>require_dir</code></li>
      </ul>
    </td>
  </tr>
 </tbody>
</table>

### <a name="manifest-directories"></a> Manifest Directories

If you create a directory, for example named `foo.js.mf` and put a bunch of javascript files in it (or any subdirectories under it), `asset-smasher` will (recursively) take all the files inside and merge them into `foo.js`.

Essentially, this is a time-saver so that you don't have to create a manifest file that only contains a single `require_tree` directive.

## <a name="command-line"></a> Using via Command-Line

Use `npm install -g asset-smasher` to install the `asset-smasher` command-line tool globally.

      asset-smasher --help

        Usage: asset-smasher [options] <output dir>

        Options:

          -h, --help               output usage information
          -V, --version            output the version number
          --compress               compress/minify the generated files
          --hash                   generate versions of the files with md5 hashes in the name
          --gzip                   generate gzipped versions of the compiled files
          --hashVersion <version>  invalidate all assets without changing file contents [1.0]
          --only <pattern,...>     only process the files matching these glob patterns (relative to any of the paths) [**/*]
          --paths <path,...>       list of paths to look for assets [.]
          --prefix <prefix>        prefix to append to logical paths when constructing urls. use if output dir is not served from the root of your web app []
          --helpers <js_file>      a .js module of helper functions require()s to expose to transforms []
          --plugins <js_file>      a .js plugin module []

        If --only is not specified, *all* files in the --paths will be processed.

        Examples:

          Compile all assets in the current directory to /home/me/compiledAssets

            $ asset-smasher /home/me/compiledAssets

          Something similar to what the Rails asset pipeline does by default

            $ asset-smasher --compress --hash --gzip --prefix /assets \
                --paths ./js,./css,./images \
                --only **/*.{jpg,gif,png},application.js.mf,application.css.mf ./public/assets

          Compile assets, providing some custom helpers to the transformation

            $ asset-smasher --helpers helpers.js output

### <a name="cli-helpers"></a> Helpers

There is a built-in `asset_path` helper that can be used to get the "real" (i.e. with hashed file name) path of an asset.  E.g. `asset_path('css/myFile.css')` might return `'/assets/css/myFile-c89cba7b7df028e65cb01d86f4d27077.css`.

Some transformers (e.g. the `.ejs` one) take in a set of local variables that they can use during transformation. You can pass in the path to a JavaScript module whose exports will be included in this set of variables.

You can use this, for example, to set configuration parameters in your JS files:

**helper.js**

    exports.serviceUrl = 'http://my.service/';

**config.js.ejs**

    //...
    var serviceUrl = '<%= serviceUrl %>';
    var cssLocation = '<%= asset_path('css/myFile.css') %>';
    //...

**Execution**

    $ asset-smasher --helpers helper.js --only config.js.ejs,css/myFile.css .
    $ cat config.js
    var serviceUrl = 'http://my.service/';
    var cssLocation = '/assets/css/myFile-c89cba7b7df028e65cb01d86f4d27077.css';


### <a name="cli-plugins"></a> Plugins

If there's a type of file you want to pre-process that is not natively supported by Asset Smasher, you can add it using a plugin file.

For an example of what the transformer classes look like, look in the `lib/compilation/transforms` directory

If a plugin module is passed (via `--plugins`), it will be `require()`d and then invoked, being passed in the asset smasher library (the module defined in `lib/asset-smasher.js`)

To register your transformer, just add another entry to the `transforms` object.

E.g.

**my_plugin.js**

    module.exports = function(assetSmasher) {
       // A stupid transformer that adds "foo" to the start and end of the contents
       var FooTransform = function FooTransform(options) {
         this.options = options || {};
       };
       FooTransform.prototype = {
         extensions:function () {
           return ['.foo'];
         },
         shouldTransform:function (file) {
           return path.extname(file) === '.foo';
         },
         transformedFileName:function (file) {
           return path.basename(file, '.foo');
         },
         transform:function (asset, cb) {
           // Transform the file name
           asset.logicalName = this.transformedFileName(asset.logicalName);
           // Get the contents
           var contents = asset.contents;
           if (Buffer.isBuffer(contents)) {
             contents = contents.toString('utf-8');
           }
           // Compile the contents
           asset.contents = 'foo-' + contents + '-foo';
           cb();
         }
       };

       assetSmasher.transforms.Foo = FooTransform;
    };

If you then invoke `asset-smasher` with `--plugins my_plugin.js` it will automatically transform `*.foo` files.

## <a name="express-middleware"></a> Using via Express Middleware

Asset smasher exposes an `express` middleware that can:

- Serve your assets un-merged/mangled in development mode.
- Serve precompiled assets (with hashed file names) in production mode.

The middleware takes in the same arguments as the `Smasher` constructor, with a few extras:

- `serve` - boolean (or object - see more below) indiacating whether the middleware should serve the asset files.  Usualy set this to `true` in development, `false` in production (e.g if you're using precompiled assets)
    - An object can be passed in with the following properties to control the serving behavior. If `true` is passed in, the default values here will be used
        - `individual` - Whether the individual (`true`) or merged files (`false`) should be served. Default `true`.
- `assetMapLocation` - path to the `map.json` generated by the command-line `asset-smasher` util.  This allows the helper methods to determine what the hashed file names were

The middleware exposes two helpers to your views:

- `js_asset(logicalPath)` - Render a `<script>` tag for the specified JS asset. When `serve` is true, this will "explode" manifests and write out a separate `<script>` for each required file.  This makes debugging much easier.
- `css_asset(logicalPath)` - Render a `<link>` tag for the specified CSS asset.  Same thing happens when `serve` is true as with `js_asset`.
- `raw_asset(logicalPath)` - Return the path to the asset.

### Example

    var assetSmasher = require('asset-smasher');

**Middleware config (Dev)**

    app.use(assetSmasher.middleware({
      serve: true,
      paths: [path.join(__dirname, 'assetDir1'), path.join(__dirname, 'assetDir2')],
      prefix: '/assets',
      outputTo: path.join(__dirname, 'tmp')
    }));

**Middleware config (Prod)**

    app.use(assetSmasher.middleware({
      serve: false,
      prefix: '/assets',
      assetMapLocation: path.join(__dirname, 'public/assets/map.json')
    }));

**Middleware config (Alternate Prod config not using precompilation, but instead compile on first access)**

Note that if you use this configuration, you will **not** be able to use "hashed" filenames.

    app.use(express.staticCache());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(assetSmasher.middleware({
      serve: {
        individual: false
      },
      paths: [path.join(__dirname, 'assetDir1'), path.join(__dirname, 'assetDir2')],
      compress: true,
      prefix: '/assets',
      // This will make the files be served once by asset smasher
      // and then by the express "static" middleware thereafter.
      // You can then also use something like "staticCache" to cache the files if you're not
      // using a reverse proxy cache on the public dir
      outputTo: path.join(__dirname, 'public/assets')
    }));

**View (ejs here, but could be others)**

    <!DOCTYPE html>
    <html>
    <head>
      <title>Test</title>
      <%- css_asset('application.css') %>
      <%- js_asset('application.js') %>
    </head>
    <body>
      This is a test
    </body>
    </html>

## <a name="programmatic-interface"></a> Using via Programmatic Interface

You can invoke Asset Smasher programmatically by `require`ing it.  You can also plug in additional transformers this way.

The `Smasher` object has the following methods:

 - `compileAssets(cb)` - Find and compile all the assets.
 - `compileSingleAsset(assetFilePath, cb)` - Compile a single asset (assetFilePath is the actual path to the file, not a logical path)
 - `findAssets(cb)` - Find, but don't compile the assets.  Good for determining dependency graph without compiling.
 - `getAssetByLogicalPath(logicalPath)` - Get information about an asset by its logical path.  Only call this after finding/compiling assets.
 - `getHashedFileMapping()` - When `hash` is true, this returns a mapping of logical path to "hashed" logical path.  This object is what the command-line tool outputs to `map.json`. Only call this after finding/compiling assets.
 - `getRequiredLogicalPathsFor(asset)` - Get the logical paths of the assets that should be merged into the specified asset (populated for `.mf` files). Only call this after finding/compiling assets.
 - `getProcessingOrderLogicalPaths()` - Get a list of the order in which assets should be processed in order to satisfy all dependencies. Only call this after finding/compiling assets.
 - `reset()` - Reset the asset metadata.

The `Asset` object returned by `getAssetByLogicalPath` has the following properties (and one method):

 - `logicalPath` - The logical path
 - `hashedPath` - If `hash` is true, the hashed filename path, otherwise the same as `logicalPath`
 - `assetFilePath` - The full path to the actual source asset
 - `compiled` - Whether the asset has been compiled
 - `compiledAssetFilePath` - The full path to the compiled asset file
 - `reset()` - Set the asset back to its before-compile state (clear out contents, set name back to pre-transform name)

**Example**

    var assetSmasher = require('asset-smasher');
    var Smasher = assetSmasher.Smasher;

    // Plug in a custom transformer
    assetSmasher.transforms['MyAwesomeFormat'] = require('myAwesomeFormatTransformer');

    var sm = new Smasher({
      paths:['/path/one', '/path/two'],
      only:['**/*.{jpg,gif,png}', 'application.js.mf', 'application.css.mf'],
      prefix:'/assets',
      compress:true,
      hash:true,
      hashVersion:'1.0',
      gzip:true,
      outputTo:__dirname + '/public/assets',
      helpers:{
       my: 'helper',
       another: 'helper'
      }
    });
    sm.compileAssets(function(err) {
      if(err) {
        console.log('An error occurred', err);
      } else {
        console.log('Compilation done!');
      }
    });

## <a name="transformer-notes"></a> Transformer Notes

### <a name="tn-less-styl"></a> LESS/Stylus

- Any `@include/@import` paths are *relative to the path that the file is in*.
- Any `@include/@import`ed files will *not* be processed individually by Asset Smasher (i.e. you can't `@include` a LESS file that is preprocessed by ejs)

### <a name="tn-ejs"></a> ejs

- Any registered helpers will be exposed as global variables to the `ejs` transform.
- The built-in `asset_paths` helper can be used here.

### <a name="tn-dust-hbs"></a> dust and Handlebars

- The name of the template will be the template's "logical path" (minus the asset path it is in), minus the `.js.dust` or `.js.hbs` file extension.
    - E.g. `/my/templates/test.js.dust`'s template name will be `test` (assuming `/my/templates` is the asset path)
