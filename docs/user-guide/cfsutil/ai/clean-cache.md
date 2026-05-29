---
description: Clear the cfsutil ai remote file cache using cfsutil ai clean-cache.
author: Analog Devices
date: 2026-04-20
---

# Clean cache

The `cfsutil ai clean-cache` command clears cached files that `cfsutil ai` has downloaded from remote URLs.

`cfsutil ai` automatically caches remote files (such as model files provided by a URL) so they can be reused consistently and when offline. If the remote file is accessible, the cache will refresh automatically after one hour to keep model files up to date.

```sh
cfsutil ai clean-cache [--format text|json]
```

Use `cfsutil ai clean-cache` to:

- Save local disk space by removing cached files.
- Force `cfsutil ai` to re-download a remote model instead of using the cached copy.

```sh
cfsutil ai clean-cache
```

!!! example "Output in JSON format"
    ```sh
    cfsutil ai clean-cache --format json
    ```
