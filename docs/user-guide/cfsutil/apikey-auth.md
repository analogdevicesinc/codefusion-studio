---
description: CFSUtil - API Key Authentication
author: Analog Devices
date: 2026-07-27
---

# API key authentication

*API keys* provide an alternative way to authenticate CLI commands without an active myAnalog session. They are useful in automated workflows, CI/CD pipelines, and scripted environments where interactive login is not possible.

!!! note
    API keys are supported in `cfsutil` only. The VS Code extension does not support API key authentication.

## Create an API key

```sh
cfsutil myanalog apikey create [--description <description>]
```

Creates a new API key. The key value is displayed once when the command succeeds — save it immediately, as it cannot be retrieved later.

| Flag | Description |
| ---- | ----------- |
| `--description <description>` | Optional label to identify the key in the output of `cfsutil myanalog apikey list`. |

!!! note
    Creating an API key requires an active myAnalog session. Run `cfsutil myanalog login` to sign in first.

!!! example
    ```sh
    cfsutil myanalog apikey create
    cfsutil myanalog apikey create --description "CI pipeline key"
    ```

## Use an API key

Set the `CFS_API_KEY` environment variable to your API key value before running a command.

```sh
CFS_API_KEY=<your-api-key> cfsutil catalog update
```

To use the key for the current shell session, export the variable:

```sh
export CFS_API_KEY=<your-api-key>
cfsutil catalog update
```

Commands that support API key authentication include `catalog update`, `ai build`, `docker pull`, and package manager commands. For details, see [Catalog](./catalog.md), [AI Build](./ai/build.md), [Docker](./docker.md), and [Package Manager](./package-manager.md).

## List API keys

```sh
cfsutil myanalog apikey list
```

Lists all API keys associated with your account, including each key's ID, masked value, and expiration date.

!!! note
    Listing API keys requires an active myAnalog session. Run `cfsutil myanalog login` to sign in first.

!!! example
    ```sh
    cfsutil myanalog apikey list
    ```

## Delete an API key

```sh
cfsutil myanalog apikey delete <key-id>
```

Deletes an API key. The key ID is shown in the output of `cfsutil myanalog apikey list`.

| Argument | Description |
| -------- | ----------- |
| `<key-id>` | The ID of the API key to delete, in the format `apikey_<id>`. |

!!! note
    Deleting an API key requires an active myAnalog session. Run `cfsutil myanalog login` to sign in first.

!!! example
    ```sh
    cfsutil myanalog apikey delete apikey_01234567890abcdef
    ```
