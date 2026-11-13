---
description: Manage telemetry preferences with the cfsutil telemetry command
author: Analog Devices
date: 2026-10-09
---

# Telemetry

The `cfsutil telemetry` commands let you manage diagnostic and usage data preferences for the CodeFusion Studio CLI. For background on what telemetry collects and how it works, refer to [Telemetry](../about/telemetry.md).

## First-run consent

The first time you run an interactive `cfsutil` command, the CLI asks whether you consent to telemetry. The prompt doesn't appear for telemetry commands or when you request JSON output:

```text
CodeFusion Studio CLI collects diagnostic and usage data, including tool
version, operating system, command categories, performance metrics, and
error codes, to improve usability and performance. A randomly generated
usage identifier is stored locally to link your sessions. No source code,
file paths, credentials, or personal details are collected.
To distinguish ADI-internal from external use, CFS checks locally whether
you are signed in to myAnalog with an ADI account or using an ADI-managed
computer; only the result is shared. To learn more, view our Privacy Policy
at https://www.analog.com/en/who-we-are/legal-and-risk-oversight/data-privacy/privacy-policy.html.

You can change this setting at any time by running: cfs telemetry disable

Press Y to consent to data sharing, or press N to decline.
```

!!! tip
    `cfs` is an alias for `cfsutil`, so `cfs telemetry disable` and `cfsutil telemetry disable` do the same thing.

Enter `Y` to share telemetry data or `N` to decline. The entry is not case-sensitive. Any other input is rejected and the prompt asks again. The CLI saves your selection in its [configuration file](#configuration) and doesn't prompt you again. In non-interactive environments (CI pipelines, piped input, or when `DO_NOT_TRACK=1` is set), the prompt is skipped and telemetry is not sent.

## Commands

### Enable telemetry

```bash
cfsutil telemetry enable
```

Enables telemetry and creates a random usage identifier if one doesn't already exist.

### Disable telemetry

```bash
cfsutil telemetry disable
```

Disables telemetry. The stored usage identifier is preserved if you enable telemetry later.

### Check telemetry status

```bash
cfsutil telemetry status
```

Displays the current telemetry preference, whether the session is non-interactive, and the privacy disclosure. When no preference is set, `status` displays that state and guidance to run `cfsutil telemetry enable` or `cfsutil telemetry disable`; it doesn't prompt or change the configuration. The next eligible interactive `cfsutil` command prompts for consent. Run `enable` or `disable` to explicitly set the preference; running `status` doesn't change it. Use `--format json` for machine-readable output, which reports the preference and session state without the disclosure:

```bash
cfsutil telemetry status --format json
```

Example output:

```json
{
    "telemetryEnabled": true,
    "telemetrySuppressed": false,
    "nonInteractiveSession": false
}
```

## Environment variables

The following environment variables affect telemetry behavior without changing the stored preference:

| Variable | Effect |
|----------|--------|
| `CFS_TELEMETRY_DISABLED=1` | Suppresses telemetry for the current invocation or environment. |
| `DO_NOT_TRACK=1` | Industry-standard signal that disables telemetry and the consent prompt. |

## Configuration

The telemetry preference is stored in the CLI configuration file:

- **Linux/macOS**: `~/.config/cfsutil/config.json`
- **Windows**: `%LOCALAPPDATA%\cfsutil\config.json`

An annotated example of the full configuration file, including the telemetry section, is available at `packages/cli/config/cfsutil/config.jsonc.example` in the repository. To use it, copy it to your config directory as `config.json` and remove the comments (standard JSON does not support comments).

The `telemetry` key contains:

```json
{
    "telemetry": {
        "version": 1,
        "enabled": true,
        "userId": "<randomly generated UUID>",
        "userType": "External"
    }
}
```

| Field | Description |
|-------|-------------|
| `version` | Schema version. Always `1` for now. |
| `enabled` | `true` or `false`. Set by the consent prompt or by `cfsutil telemetry enable` / `cfsutil telemetry disable`. When absent, the CLI prompts on the next interactive run. |
| `userId` | Random identifier (UUID) stored locally to link telemetry sessions. |
| `userType` | `External` or `Internal`, based on a local check of your myAnalog account or ADI-managed computer when telemetry is enabled. A first-time `cfsutil telemetry disable` stores `External` as an unshared placeholder without local classification. Only the classification result is shared. |
