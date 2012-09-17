# Asset Smasher Changelog

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
