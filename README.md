# Asset Smasher

Asset pre-processor, merger, and compressor for Node.js

## Overview

Asset Smasher is a command-line tool, express middleware, and programmatic interface for:

- Pre-processing and transforming files down to plain JavaScript and CSS.
    - `.coffee` - Compile CoffeeScript into JavaScript
    - `.ejs` - Run a file through EJS (e.g. to populate configuration parameters into a JavaScript file)
    - `.less` - Compile Less into CSS
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
    - Compress LESS during LESS preprocessing
    - Generate Gzipped versions of files
    - Include a MD5 hash of the file's contents in the file name. `myAsset.js` -> `myAsset-c89cba7b7df028e65cb01d86f4d27077.js`

## Structuring Your Assets

## Usage

### Command-Line

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
          --prefix <prefix>        prefix to append to referenced paths []
          --helpers <js_file>      a .js module of helper functions require()s to expose to transforms []
          --plugins <js_file>      a .js plugin module []

        If --only is not specified, *all* files in the --paths will be processed.

        Examples:

          Compile all assets in the current directory to /home/me/compiledAssets

            $ asset-smasher /home/me/compiledAssets

          Something similar to what the Rails asset pipeline does by default

            $ asset-smasher --compress --hash --gzip --prefix=/assets \
                --paths=./js,./css,./images \
                --only **/*.{jpg,gif,png},application.js.mf,application.css.mf ./public/assets

          Compile assets, providing some custom helpers to the transformation

            $ asset-smasher --helpers helpers.js output

#### Helpers

Some transformers (e.g. the `.ejs` one) take in a set of local variables that they can use during transformation.
You can pass in the path to a JavaScript module whose exports will be included in this set of variables.

You can use this, for example, to set configuration parameters in your JS files:

**helper.js**

    exports.serviceUrl = 'http://my.service/';

**config.js.ejs**

    //...
    var serviceUrl = '<%= serviceUrl %>';
    //...

**Execution**

    $ asset-smasher --helpers helper.js --only config.js.ejs .
    $ cat config.js
    var serviceUrl = 'http://my.service/';


### Express

Asset smasher exposes an `express` middleware that can:
- Serve your assets un-merged/mangled in development mode.
- Serve the smashed assets in production mode.

### Programmatic Interface
