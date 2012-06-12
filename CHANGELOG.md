# Asset Smasher Changelog

## 0.1.1 (June 12, 2012)

- Fix issue where assets could get processed multiple times when calling `compileSingleAsset`.  When calling `compileSingleAsset`, an asset will not be recompiled if it has already been compiled.  If it hasn't been compiled, any `require`d assets will be recompiled even if they've been compiled already.
- Add a `reset` method to `Smasher` to clear out all the asset metadata.
- Add a `reset` method to `Asset` to set it back to its before-compile state.

## 0.1.0

- Initial Release