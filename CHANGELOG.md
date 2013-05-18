# Asset Smasher Changelog

## 0.2.11 (May 18, 2013)

- No functional changes
- Extract and use `dependency-graph` module.

## 0.2.10 (April 29, 2013)

- Ensure assets required by a manifest are of the right type. (Fixes #15)

## 0.2.9 (April 29, 2013)

- Ignore `require_dir` directive in manifest file if the required directory doesn't exist. Previously this would throw an EMFILE and was inconsistent with what `require` and `require_tree` did (which was ignore the directive). (Fixes #13)
- Add two additional options, `--verbose` and `--noclean`. `--verbose` will log information about what's going on to the console, while `--noclean` will not delete the output directory when running the tool (by default the output directory will be cleared). (Fixes #13)

## 0.2.8 (April 28, 2013)

- Allow 'manifest directories' to be created. If a directory name ends in '.mf' it is treated as it it were a manfiest file that does a `require_tree` on that directory. (Fixes #12)

## 0.2.7 (April 17, 2013)

- Use async.eachLimit to avoid EMFILE in asset output. (Fixes #10)

## 0.2.6 (April 17, 2013)

- Limit the number of files to process in parallel to avoid EMFILE. (Fixes #9)

## 0.2.5 (March 18, 2013)

- Stop starving the event loop during `async.eachSync` calls. Fixes compatibilty with node `0.10.x`. (Fixes #8)

## 0.2.4 (March 16, 2013)

- Allow more fine-grained control over the `serve` option of the middleware (e.g. serving merged files instead of individual ones). See alternate production config in `README.md` for usage. (Fixes #7)

## 0.2.3 (March 14, 2013)

- Use the `send` module rather than the internals of connect's static middleware. (Fixes #6)
- Minify all CSS (not just CSS generated from LESS/stylus) using the `ycssmin` module. (Fixes #4)
- Update to latest versions of dependencies.

## 0.2.2 (November 7, 2012)

- Ensure that concurrent requests for assets are correctly compiled by the connect middleware (Fixes #5)

## 0.2.1 (September 17, 2012)

- Allow the `asset_src` helper to work with assets whose names have been transformed.

## 0.2.0 (August 15, 2012)

- Add a transformer for Stylus `.styl` files (Fixes #2)
- Document how to plug in additional transformers.

## 0.1.4 (July 5, 2012)

- Add a `raw_asset` helper function to the middleware that returns the asset URL

## 0.1.3 (June 28, 2012)

- Use the right version of "exists" (fs.exists || path.exists) to get rid of deprecation warning messages

## 0.1.2 (June 27, 2012)

- Update package dependencies to ones that work with 0.8
- Still using deprecated path.exists to avoid breaking 0.6 compatibility

## 0.1.1 (June 12, 2012)

- Fix issue where assets could get processed multiple times when calling `compileSingleAsset`.  When calling `compileSingleAsset`, an asset will not be recompiled if it has already been compiled.  If it hasn't been compiled, any `require`d assets will be recompiled even if they've been compiled already.
- Add a `reset` method to `Smasher` to clear out all the asset metadata.
- Add a `reset` method to `Asset` to set it back to its before-compile state.

## 0.1.0

- Initial Release
