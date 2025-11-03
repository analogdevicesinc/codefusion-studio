---
description: Information on the Telemetry feature in CodeFusion Studio
author: Analog Devices
date: 2025-10-09
---

# Telemetry

If you choose to enable telemetry, CodeFusion Studio collects a limited set of anonymous diagnostics and usage data. This currently includes events related to workspace creation and extension activation.

- Workspace creation events include non-identifying metadata such as the selected SoC, board, and plugin.
- Extension activation events include timing information (for example, activation duration) to help us understand and improve startup performance.

This data is used solely to improve the functionality and user experience of CodeFusion Studio. For more information, refer to our [:octicons-link-external-24: Privacy Policy](https://www.analog.com/en/who-we-are/legal-and-risk-oversight/data-privacy/privacy-policy.html).

## Enable Telemetry

Telemetry is **disabled by default**. When you first launch CodeFusion Studio, you’ll be prompted to choose whether you want to enable telemetry:

- **Share Anonymous Data** – Enables telemetry to help improve CodeFusion Studio
- **Don’t Share Data** – Disables telemetry

If you dismiss the prompt without making a choice, it will reappear each time you start CodeFusion Studio until a selection is made.

## Update Telemetry settings

You can update your telemetry settings at any time through VS Code settings:

1. Open **Settings** (press `Ctrl,` on Windows/Linux or `Cmd,` on macOS, or use the gear icon in the lower-left corner).
1. Search for `cfs.telemetry`.
1. Choose your preferred option.

Alternatively, edit the `settings.json` file in your CFS workspace and set:

```json
"cfs.telemetry.enable": true   // or false
```

If you remove this setting from `settings.json`, the telemetry prompt will reappear each time CodeFusion Studio starts until a value is defined.

!!! note
    The CFS telemetry setting (`cfs.telemetry.enable`) respects the global VS Code telemetry setting (`telemetry.telemetryLevel`). For additional information, see [:octicons-link-external-24: VS Code Telemetry](https://code.visualstudio.com/docs/configure/telemetry). If the CFS telemetry setting is enabled but the global setting is disabled, telemetry will not be sent.

### Telemetry user ID

When CodeFusion Studio first launches, it automatically generates a unique user identifier stored under the setting:

```json
"cfs.telemetry.userId"
```

This identifier is created on first run, even if telemetry is later disabled. It allows anonymous telemetry events to be grouped by user session for aggregate analysis, for example, identifying the type of workspace created (such as the selected SoC, board, or plugin). If you delete this setting, a new ID is generated automatically the next time CodeFusion Studio starts. The `cfs.telemetry.userId` value does not contain personal data and is used solely for anonymous analytics.

!!! note
    The presence of this setting does not mean telemetry is active. Telemetry is only sent if both the global VS Code telemetry setting (`telemetry.telemetryLevel`) and the CFS setting (`cfs.telemetry.enable`) are enabled.

## View Telemetry requests

Advanced users can use network inspection tools to view the full content of telemetry requests.

1. Install a network inspection tool that supports HTTPS decryption — for example, Fiddler Everywhere (cross-platform).
For proxy-based tools, you’ll typically need to enable HTTPS traffic decryption and install a custom root certificate.
1. Trigger a telemetry event, like creating a new workspace.
1. Look for a POST request sent shortly after the event, targeting a domain that includes `telemetry` and a path ending in `/v1/logs`.

Example telemetry data sent as part of workspace creation:

```json
{
    "appId": "<APP_ID>",
    "message": {
        "event": {
            "action": "Workspace created",
            "timestamp": 1759940462507,
            "metadata": {
                "soc": "MAX32690",
                "package": "TQFN",
                "board": "EvKit_V1",
                "pluginId": "com.analog.singlecore.msdk.helloworld",
                "projects": [],
                "hostOS": "darwin",
                "cfsVersion": "2.0.0",
                "vscodeVersion": "1.100.0",
                "userId": "<USER_ID>",
                "sessionId": "<SESSION_ID>"
            }
        }
    }
}
```
