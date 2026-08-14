---
description: CFSUtil - Docker
author: Analog Devices
date: 2026-07-27
---

# Docker

The CLI can be used to pull Docker images from the Analog Devices registry. If you are logged in to myAnalog or have set the `CFS_API_KEY` environment variable with a valid API key, your credentials are used for authentication. See [myAnalog authentication](./myanalog-auth.md) and [API key authentication](./apikey-auth.md) for more information.

## Requirements

The CLI will invoke Docker or Podman to perform the `pull`, so one of these applications must be installed and found on `PATH`.

- Docker
- Podman

## Pull image

```sh
cfsutil docker pull IMAGE [-n] [-q] [-u]
```

| Flag | Description |
| --- | --- |
| `-n, --nocredential` | Do not use credentials when pulling the image. |
| `-u, --update` | Pull the Docker image even if it already exists locally. |
| `-q, --quiet` | Suppress output from the pull command. |

!!! example

    ```sh
    cfsutil docker pull docker.cloudsmith.io/adi/codefusion-public/EXAMPLE -q
    ```
