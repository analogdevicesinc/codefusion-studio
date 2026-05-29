---
description: CFSUtil - Catalog
author: Analog Devices
date: 2026-05-12
---

# Catalog

The SoC catalog provides the latest metadata for supported System-on-Chip (SoC) devices, ensuring access to up-to-date information on documentation, cores, boards, and packages.

The `catalog` commands allow you to update the SoC catalog to the latest online version, or restore it to the version that was created when you installed CodeFusion Studio.

## Update the catalog

```sh
cfsutil catalog update
```

Updates the catalog to the latest version available online. Requires an internet connection and active session with a myAnalog account.

## Restore the catalog

```sh
cfsutil catalog restore
```

Restores the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will delete the existing catalog.

## Additional information

- [myAnalog authentication](./myanalog-auth.md) – Authenticate with your myAnalog account to update the catalog.
- [Catalog Manager](../developer-tools/catalog-manager.md) – Learn about the background service that manages the SoC catalog.
