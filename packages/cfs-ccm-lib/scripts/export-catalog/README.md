# export-catalog

## Description

This is a simple CLI script which reads the data from a CCM backend and exports it to a zip file which can be used by the `import()` function of `SocCatalog` or `ResourceCatalog` in `cfs-ccm-lib` as an offline data source.

## Getting started

Environment variables are used for configuration:

- `CFS_API_URL`: the URL of the CCM backend instance to connect to
- `CFS_API_KEY`: the API key to use if any non-public data should be included

Postman can be used to create the API key.  `.env` files are supported and are searched for in the current working directory, the `cfs-ccm-lib` package directory, and the root `codefusion-studio` directory.

Example `.env` file:

```shell
CFS_API_KEY=<your api key here>
CFS_API_URL=<url of the CCM instance>
```

The API key is optional, without it only the publicly available data will be included in the catalog.  API keys can be created with different access permissions (and therefore used to create offline catalogs with different contents).

## Exporting Data

Running `yarn ws:ccm-lib export:catalog` from the root `codefusion-studio` directory will download all SoC and Resource data from the server and export it to a zip file (this will also create catalog(s) which are directly usable by `SocCatalog` or `ResourceCatalog`, by default this goes in `packages/cfs-ccm-lib/tmp/catalog` but that can be overridden by adding `-d <path to catalog dir>`). The default exported zip file path is `packages/cfs-ccm-lib/cfs-catalog.zip`, and can be overridden with `-o <path to zip file>`. Non-absolute override paths are resolved relative to `packages/cfs-ccm-lib`.

To limit which catalogs are downloaded use `-c` to specify `soc` or `resource` (default is to include both).  If more catalogs are added in the future `-c` can be specified multiple times.  To constrain the items in the catalog by their supported CFS version use `--cfs-version` followed by a valid semver, an `*` (which matches all versions), or an empty string `""` which returns only unversioned entries. The default is the current `cfs-ccm-lib` package version when run as a `yarn` script (i.e., when `npm_package_version` is set), otherwise the version filter is unset.

Example:

```shell
yarn ws:ccm-lib export:catalog -o my-data.zip -d ~/.cache/myCatalog
```

would create `packages/cfs-ccm-lib/my-data.zip` and use `~/.cache/myCatalog` to create the catalog in.
