# Changelog

<!--
  Release process: before tagging v<x.y.z>, rename the "Unreleased" heading
  below to "## [<x.y.z>] - <YYYY-MM-DD>". The release workflow extracts the
  section whose heading matches the pushed tag and uses it as the GitHub
  release body. If no matching section exists, the release fails.
-->

## [Unreleased]

### Fixed
- Triggers now run only on the primary (active) GM, preventing duplicate execution when more than one GM is connected.
- `onRoundStart` no longer fires when combat is stepped backward to a previous round.

## [1.0.0] - 2026-06-28

### Added
- Initial release.
