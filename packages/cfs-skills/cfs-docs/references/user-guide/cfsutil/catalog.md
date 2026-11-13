---
description: CFSUtil - Catalog
author: Analog Devices
date: 2026-10-08
---

# Catalog

The SoC catalog provides the latest metadata for supported System-on-Chip (SoC) devices, ensuring access to up-to-date information on documentation, cores, boards, and packages.

The `catalog` commands allow you to update the SoC catalog to the latest online version, or restore it to the version that was created when you installed CodeFusion Studio.

## Update the catalog

```sh
cfsutil catalog update [--format text|json]
```

Updates the catalog to the latest version available online. Requires an internet connection. If you don't have an active myAnalog session or a valid API key in `CFS_API_KEY`, the update uses the public catalog and might omit restricted SoCs.

| Flag | Description |
| --- | --- |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

With `--format json`, `data` is `{ "updated": true }` on success. If the update fails, the error code is `CATALOG_UPDATE_FAILED`.

## Restore the catalog

```sh
cfsutil catalog restore [--format text|json]
```

Restores the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will delete the existing catalog.

| Flag | Description |
| --- | --- |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

## Additional information

- [myAnalog authentication](./myanalog-auth.md) – Authenticate with your myAnalog account to update the catalog.
- [API key authentication](./apikey-auth.md) – Use an API key instead of a myAnalog session.
- [Catalog Manager](../developer-tools/catalog-manager.md) – Learn about the background service that manages the SoC catalog.
