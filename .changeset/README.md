# Changesets

Run `pnpm changeset` in a pull request to describe a change for the release notes. The four npm
packages are versioned together (`fixed`), and the composer packages follow the same version.

On `main`, the release workflow opens a "Version packages" pull request. Merging it publishes to
npm and tags `@php-script/editor@<version>`, which triggers the Packagist split.
