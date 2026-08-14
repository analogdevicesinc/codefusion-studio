---
description: Information on the Telemetry feature in CodeFusion Studio
author: Analog Devices
date: 2026-07-30
---

# Telemetry

If you enable telemetry, CodeFusion Studio collects a limited set of anonymous diagnostics and usage data. This data helps us understand which features are used most often so we can prioritize improvements and fix problems. It is used solely to improve the functionality and user experience of CodeFusion Studio.

Telemetry is **disabled by default** and collects no personally identifying information. For more information, refer to our [:octicons-link-external-24: Privacy Policy](https://www.analog.com/en/who-we-are/legal-and-risk-oversight/data-privacy/privacy-policy.html){:target="_blank"}.

## What we collect

### Activities we record

When telemetry is enabled, CodeFusion Studio records anonymous events for the following activities:

- **Extension activation** — startup and shutdown, including activation timing to help us improve performance, and opening a CodeFusion Studio workspace.
- **Telemetry preference** — selecting **Share Anonymous Data** when prompted to enable telemetry.
- **Workspace creation** — including whether creation succeeded or failed and non-identifying context about the projects created in the workspace.
- **Feature access and navigation** — opening a tool or view and selecting items in the **Quick Access** panel, so we can understand which features are used most.
- **System Planner configuration** — opening the configuration tools and navigating between screens; allocating, deallocating, and configuring peripherals; assigning pins and signals; configuring clocks; creating, modifying, or deleting memory partitions; and configuring data flows.
- **Code generation** — including whether generation succeeded or failed.
- **Building and flashing** — operations and whether each succeeds or fails.
- **Debugging** — starting debug sessions, opening SEGGER Ozone, using the GDB Toolbox, starting the Model Context Protocol (MCP) server for the AI Debug Assistant, and capturing and saving diagnostic event data.
- **AI model tools** — model validation, compatibility checks, on-hardware profiling, hardware deployment, code generation, and capturing profiler traces.

### Information included with each event

Every event includes a small set of non-identifying metadata:

- **Environment** — CodeFusion Studio version, VS Code version, and host operating system (for example, `osx`, `windows`, or `linux`).
- **Anonymous identifiers** — a randomly generated user ID and a session ID, used only to group events for aggregate analysis. For details, view [Telemetry user ID](#telemetry-user-id).
- **User type** — whether the session is an internal Analog Devices user or an external user. This lets us distinguish internal testing from real-world usage.
- **Event-specific context** — some events include details relevant to the activity, such as the selected system on chip (SoC) and package, the build system, the flash method, and the duration and outcome of the operation. For example, a successful build event records the following event-specific fields:

    ```json
    {
        "soc": "MAX32690",
        "socPackage": "TQFN",
        "buildSystem": "ninja",
        "exitCode": 0,
        "durationMs": 4820
    }
    ```

### What we don't collect

- No source code, file contents, file paths, or project names.
- No personal information. The user ID is a random identifier, not tied to your name, email, or account.
- No names of custom hardware or plugins. When you use a board or plugin that was not developed by Analog Devices, its name is replaced with `Custom` before the event is sent, so your proprietary designs are not disclosed.

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

You can view telemetry activity in two ways: the **Output** panel shows which events CodeFusion Studio attempts to send and which fields they include, and a network inspection tool shows the full content of each request.

### View telemetry events in the Output panel

Use the **Output** panel to confirm that an action (such as creating a workspace or building a project) triggered a telemetry send attempt and to view the attempted event.

1. Select **View → Output**, or press `Ctrl+Shift+U` on Windows/Linux or `Cmd+Shift+U` on macOS.
1. Select **CodeFusion Studio** from the channel list.
1. Look for lines containing `[Telemetry]`. The panel retains logged events, so any actions you have already taken in this session appear here. Each line shows the event name and the event-specific metadata field names, for example:

    ```text
    [Telemetry] workspace_create_success - Data: ["soc","package","board","pluginId","projects"]
    ```

    The **Output** panel lists event-specific field names, but not their values or the standard fields added to every request. To inspect the complete request values, use a network inspection tool.

### View the full request content

Advanced users can use network inspection tools to view the full content of telemetry requests, including field values.

1. Install a network inspection tool that supports HTTPS decryption — for example, Fiddler Everywhere (cross-platform).
For proxy-based tools, you’ll typically need to enable HTTPS traffic decryption and install a custom root certificate.
1. Trigger a telemetry event, like creating a new workspace.
1. Look for a POST request sent shortly after the event, targeting a domain that includes `telemetry` and a path ending in `/v1/logs`.

The following example shows telemetry data sent as part of workspace creation. The `board` and `pluginId` values use Analog Devices hardware and plugins; the name of a custom board or plugin appears as `Custom`.

```json
{
    "appId": "<APP_ID>",
    "message": {
        "event": {
            "action": "workspace_create_success",
            "timestamp": 1759940462507,
            "metadata": {
                "soc": "MAX32690",
                "package": "TQFN",
                "board": "EvKit_V1",
                "pluginId": "com.analog.singlecore.msdk.helloworld",
                "projects": [
                    {
                        "coreId": "CM4",
                        "pluginId": "com.analog.singlecore.msdk.helloworld",
                        "pluginVersion": "1.0.0",
                        "firmwarePlatform": "msdk"
                    }
                ],
                "cfsVersion": "2.3.0",
                "vscodeVersion": "1.101.0",
                "userId": "<USER_ID>",
                "userType": "External",
                "sessionId": "<SESSION_ID>",
                "hostOS": "osx"
            }
        }
    }
}
```
