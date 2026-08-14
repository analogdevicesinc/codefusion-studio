---
name: cfs-docs
description: Answer questions about CodeFusion Studio (CFS) by reading the relevant documentation. Use whenever someone asks how to install, set up, use, or troubleshoot CFS — including the VS Code extension, cfsutil CLI, System Planner, debug driver installation and hardware connection (J-Link, Olimex, ICE), build/flash/debug workflows, AI model integration, package manager, plugins, or release notes. Good for customers, new hires, and developers who want doc-backed answers without leaving the terminal.
metadata:
  version: 1.0.0
---

# CFS Guide

Answer user questions about CodeFusion Studio by reading only the specific documentation files relevant to their question. Do not read files speculatively — load them on demand as the question requires.

Documentation paths under `references/…` are bundled with this skill and are relative to the skill directory. Read them from there.

## Quick reference: which files to read

Match the user's question to a topic in the following table and read only those files. Start with index or overview files; load sub-files only if the question requires deeper detail.

| Topic | Files to read |
|-------|--------------|
| What is CFS / overview | `references/user-guide/about/purpose.md`, `references/user-guide/about/features.md` |
| CFS UI / navigation | `references/user-guide/about/navigation.md` |
| Supported processors | `references/user-guide/about/supported-processors.md` |
| Supported AI model formats | `references/user-guide/about/supported-ai-model-formats.md` |
| Telemetry settings | `references/user-guide/about/telemetry.md` |
| Getting help in CFS | `references/user-guide/about/help.md` |
| Software requirements | `references/user-guide/installation/software-requirements.md` |
| Install CFS | `references/user-guide/installation/install-cfs.md` |
| Install VS Code extensions | `references/user-guide/installation/install-extensions.md` |
| Set up CFS / SDK path configuration | `references/user-guide/installation/set-up-cfs.md` |
| Package manager overview | `references/user-guide/installation/package-manager/index.md` |
| Manage packages using cfsutil | `references/user-guide/installation/package-manager/manage-packages-cfsutil.md` |
| Manage packages using command palette | `references/user-guide/installation/package-manager/manage-packages-command-palette.md` |
| Manage packages using the IDE (Package Manager view) | `references/user-guide/installation/package-manager/manage-packages-ide.md` |
| Available packages | `references/user-guide/installation/package-manager/available-packages.md` |
| Install required packages | `references/user-guide/installation/package-manager/install-required.md` |
| Package manager authentication (myAnalog) | `references/user-guide/installation/package-manager/auth.md` |
| Package manager troubleshooting | `references/user-guide/installation/package-manager/troubleshooting-package-manager.md` |
| Create a new workspace | `references/user-guide/workspaces/create-new-workspace.md` |
| Available workspace templates / what templates exist / which template for my SoC | Run `cfsutil cfsplugins list --service workspace` to list available templates. Add `--soc <soc>` to filter by SoC (for example, `--soc MAX32657`), `--board <board>` to filter by board. Resolve `cfsutil` as described in rule 8 before presenting or running the command. Some templates and SoCs are only visible when authenticated — see the myAnalog authentication row if the user needs to log in. |
| Open an existing workspace | `references/user-guide/workspaces/open-workspace.md` |
| Open / explore example projects | `references/user-guide/workspaces/open-and-migrate-example.md` |
| Migrate MSDK project to System Planner | `references/user-guide/workspaces/migrate-project-to-system-planner.md` |
| Create workspace from AI model file | `references/user-guide/workspaces/create-workspace-from-ai-model.md` |
| Deploy and profile an AI model | `references/user-guide/workspaces/deploy-and-profile-ai-model.md` |
| TrustZone / secure workspace setup | `references/user-guide/workspaces/targets/trustzone.md` |
| System Planner overview | `references/user-guide/tools/index.md` |
| Peripheral allocation | `references/user-guide/tools/peripheral-allocation.md` |
| Pin configuration | `references/user-guide/tools/pin-config.md` |
| Clock configuration | `references/user-guide/tools/clock-config.md` |
| Memory allocation | `references/user-guide/tools/memory-allocation.md` |
| Registers view | `references/user-guide/tools/registers.md` |
| Manage AI models (System Planner) | `references/user-guide/tools/manage-ai-models.md` |
| Profiling / capture traces | `references/user-guide/tools/profiling.md` |
| Profiling report | `references/user-guide/tools/profiling-report.md` |
| Compatibility report | `references/user-guide/tools/compat-report.md` |
| Generate code | `references/user-guide/tools/generate-code.md` |
| Build tasks (build, clean, flash, debug) | `references/user-guide/build-and-flash/tasks.md` |
| CFS build settings | `references/user-guide/build-and-flash/cfs-settings.md` |
| CFS Terminal (integrated terminal) | `references/user-guide/build-and-flash/cfs-terminal.md`, `references/user-guide/cfsutil/index.md` |
| Flash / build and flash | `references/user-guide/build-and-flash/index.md` |
| Zephyr build workflow | `references/user-guide/build-and-flash/zephyr.md` |
| Build troubleshooting | `references/user-guide/build-and-flash/troubleshooting.md` |
| cfsutil CLI overview | `references/user-guide/cfsutil/index.md` |
| cfsutil catalog | `references/user-guide/cfsutil/catalog.md` |
| cfsutil CFS plugins | `references/user-guide/cfsutil/cfs-plugins.md` |
| cfsutil device tree | `references/user-guide/cfsutil/device-tree.md` |
| cfsutil docker | `references/user-guide/cfsutil/docker.md` |
| cfsutil ELF utilities | `references/user-guide/cfsutil/elf-utilities.md` |
| cfsutil generate | `references/user-guide/cfsutil/generate.md` |
| cfsutil myAnalog authentication | `references/user-guide/cfsutil/myanalog-auth.md` |
| cfsutil API key authentication (`CFS_API_KEY`, continuous integration and continuous delivery (CI/CD) auth, `myanalog apikey`) | `references/user-guide/cfsutil/apikey-auth.md` |
| cfsutil package manager | `references/user-guide/cfsutil/package-manager.md` |
| cfsutil oclif plugins | `references/user-guide/cfsutil/oclif-plugins.md` |
| cfsutil port | `references/user-guide/cfsutil/port.md` |
| cfsutil project commands | `references/user-guide/cfsutil/project.md` |
| cfsutil SoCs (list SoCs, boards, cores) | `references/user-guide/cfsutil/socs.md` |
| cfsutil tasks | `references/user-guide/cfsutil/tasks.md` |
| cfsutil workspace commands | `references/user-guide/cfsutil/workspace.md` |
| cfsutil AI commands overview | `references/user-guide/cfsutil/ai/index.md` |
| cfsutil ai backends | `references/user-guide/cfsutil/ai/backends.md` |
| cfsutil ai build | `references/user-guide/cfsutil/ai/build.md` |
| cfsutil ai clean-cache | `references/user-guide/cfsutil/ai/clean-cache.md` |
| cfsutil ai compat | `references/user-guide/cfsutil/ai/compat.md` |
| cfsutil ai model | `references/user-guide/cfsutil/ai/model.md` |
| cfsutil ai profile | `references/user-guide/cfsutil/ai/profile.md` |
| cfsutil ai workspace | `references/user-guide/cfsutil/ai/workspace.md` |
| Debug setup overview | `references/user-guide/debugging/index.md` |
| Install J-Link drivers | `references/user-guide/debugging/debug-drivers/install-jlink-drivers.md` |
| Install Olimex drivers | `references/user-guide/debugging/debug-drivers/install-olimex-drivers.md` |
| Install ICE drivers | `references/user-guide/debugging/debug-drivers/install-ice-drivers.md` |
| Connect hardware / debug hardware setup | `references/user-guide/debugging/connect-hardware.md` |
| Debug an application (create configs, start debugging) | `references/user-guide/debugging/debug-an-application.md` |
| Debug interface (breakpoints, call stack, memory, watches) | `references/user-guide/debugging/debug-interface.md` |
| Multi-core debugging | `references/user-guide/debugging/debug-multi-core-application.md` |
| SHARC-FX debugging | `references/user-guide/debugging/debug-sharc-fx.md` |
| Debug with Ozone (SEGGER) | `references/user-guide/debugging/debug-with-ozone.md` |
| Debug troubleshooting | `references/user-guide/debugging/troubleshooting.md` |
| AI Debug Assistant overview | `references/user-guide/debugging/debug-tools/ai-debug-assistant/index.md` |
| AI Debug Assistant getting started | `references/user-guide/debugging/debug-tools/ai-debug-assistant/getting-started.md` |
| Using the AI Debug Assistant | `references/user-guide/debugging/debug-tools/ai-debug-assistant/using-ai-debug-assistant.md` |
| AI Debug Assistant reference | `references/user-guide/debugging/debug-tools/ai-debug-assistant/reference.md` |
| AI Debug Assistant troubleshooting | `references/user-guide/debugging/debug-tools/ai-debug-assistant/troubleshooting.md` |
| Core dump overview | `references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-overview.md` |
| Enable core dumps | `references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-enable.md` |
| Analyze a core dump | `references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-analyze.md` |
| Interpret core dump results | `references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-interpret.md` |
| GDB Toolbox overview | `references/user-guide/debugging/debug-tools/gdb-toolbox/gdb-toolbox-about.md` |
| GDB Toolbox usage | `references/user-guide/debugging/debug-tools/gdb-toolbox/gdb-toolbox.md` |
| GDB Toolbox examples | `references/user-guide/debugging/debug-tools/gdb-toolbox/gdb-toolbox-examples.md` |
| GDB Toolbox reference | `references/user-guide/debugging/debug-tools/gdb-toolbox/gdb-toolbox-reference.md` |
| Memory viewer | `references/user-guide/debugging/debug-tools/memory-viewer/index.md` |
| ELF File Explorer | `references/user-guide/developer-tools/elf-file-explorer.md` |
| Device Tree View | `references/user-guide/developer-tools/device-tree-view.md` |
| Catalog Manager | `references/user-guide/developer-tools/catalog-manager.md` |
| CFS AI Skills (cfs-docs / cfs-cli skills in Copilot and Claude Code) | `references/user-guide/developer-tools/cfs-ai-skills.md` |
| Plugins overview | `references/user-guide/plugins/index.md` |
| Plugin integration | `references/user-guide/plugins/plugin-integration-overview.md` |
| Develop custom plugins | `references/user-guide/plugins/develop-plugins.md` |
| SDK / Zephyr / third-party resources | `references/user-guide/resources/sdk-resources.md`, `references/user-guide/resources/third-party-resources.md` |
| Security resources (TESA, TrustZone) | `references/user-guide/resources/security-resources.md` |
| Uninstall CFS | `references/user-guide/uninstall/uninstall-cfs.md` |
| GDB tutorial | `references/tutorials/gdb-tutorial/index.md` (then sub-files as needed: `references/tutorials/gdb-tutorial/gdb-basics.md`, `references/tutorials/gdb-tutorial/gdb-command-types.md`, `references/tutorials/gdb-tutorial/gdb-commands.md`) |
| Tutorials overview | `references/tutorials/index.md` |
| MAX32657 Zephyr tutorial (blinky, low-power mode) | `references/tutorials/max32657-zephyr/index.md` (then sub-files as needed: `references/tutorials/max32657-zephyr/blinky.md`, `references/tutorials/max32657-zephyr/low-power-mode.md`) |
| Release notes / what's new / changelog | `references/release-notes/index.md`, then the specific version file. Available versions: `references/release-notes/2.3.0.md`, `references/release-notes/2.2.1.md`, `references/release-notes/2.2.0.md`, `references/release-notes/2.1.0.md`, `references/release-notes/2.0.2.md`, `references/release-notes/2.0.1.md`, `references/release-notes/2.0.0.md`, `references/release-notes/1.1.0.md`, `references/release-notes/1.0.2.md`, `references/release-notes/1.0.0.md` |
| Known bugs / errata / workarounds | Read the relevant version's release notes file (for example, `references/release-notes/2.3.0.md`) |
| Glossary / term definitions | `references/glossary.md` |
| Hardware specs / datasheet links / chip documentation | `references/user-guide/about/supported-processors.md` — each SoC links to its analog.com product page, which links to the datasheet. See also rule 7. |

## How to respond

1. Identify which topic(s) the user is asking about using the "Quick reference: which files to read" table.
2. Read the listed file(s) for that topic. For overview-style questions, start with the index file and read sub-files only if needed.
3. For multi-topic questions, read each relevant set of files before answering.
4. If nothing in the table matches, browse the bundled `references/` directory to find the closest matching page, then read it. The "Quick reference: which files to read" table lists every page bundled with this skill; if the topic genuinely is not covered, say so rather than guessing.
5. Answer directly from the documentation. When it helps the user find more detail, mention the doc path.
6. If the documentation doesn't cover what the user needs, say so clearly rather than guessing.
7. For questions about hardware limits or chip specifications (clock speeds, SPI baud rates, pin counts, etc.): the CFS docs don't publish raw hardware specs. Read `references/user-guide/about/supported-processors.md` to find the analog.com product page link for the user's SoC — the datasheet is linked from there. Also point them to System Planner, which shows valid values interactively across clock config, peripheral allocation, and pin config.
8. **CLI and terminal usage:** CodeFusion Studio command-line tasks are performed using `cfsutil`.

   **Resolve the executable before presenting or running any command:**
   - If `cfsutil` is already on `PATH` — which is the case in the **CFS Terminal** in VS Code, the recommended way to run these commands — use bare `cfsutil`.
   - Otherwise, use the concrete install path for a **specific installed version** (never a wildcard, which does not expand on Windows and is ambiguous when several versions are installed). The install root is `~/analog/cfs/` (macOS/Linux) or `C:\analog\cfs\` (Windows); list that directory to find the actual version folder, then use:
     - macOS/Linux: `~/analog/cfs/<version>/Utils/cfsutil/bin/cfsutil`
     - Windows: `C:\analog\cfs\<version>\Utils\cfsutil\bin\cfsutil.cmd`
   - Do not emit a command containing `*` or a literal `<version>`; resolve `<version>` to a real directory name first, or fall back to bare `cfsutil` on PATH.

   Before presenting or running a command, verify its syntax from the relevant documentation. If the documentation is insufficient, verify it by running the appropriate `<resolved-cfsutil> <subcommand> --help`. Never guess command syntax or invent required arguments—use documented defaults where available, otherwise ask a concise follow-up question.

   If neither `cfsutil` on `PATH` nor an install directory under `~/analog/cfs/` (or `C:\analog\cfs\`) can be found, explain that CodeFusion Studio does not appear to be installed and direct the user to `references/user-guide/installation/install-cfs.md`.

   **Proactively offer to run CLI-capable tasks.** Many how-to tasks have a `cfsutil` equivalent — for example creating and configuring a workspace, regenerating a project, generating code from a `.cfsconfig`, listing or exporting SoC data, managing packages, and analyzing ELF files. When a user asks how to do one of these (even without mentioning the terminal or CLI) and running commands is available, give the documented workflow and then offer to run it for them with `cfsutil`, asking for any inputs the command needs. Only offer this for tasks that have a genuine `cfsutil` equivalent; interactive GUI-only tools such as pin configuration, clock configuration, and other System Planner views have no CLI path, so describe the UI workflow and do not offer to run those.

   **If the user asks how to perform a task** from the terminal, shell, CLI, or using `cfsutil`:
   - Show the appropriate command.
   - Briefly explain what it does.
   - If running commands is available, offer to run it.

   **If the user asks you to perform a task** from the terminal, shell, CLI, or using `cfsutil`:
   - Run the command if running commands is available.
   - Show the command that was run.
   - Summarize the results and any recommended next steps.
   - Otherwise, explain that running commands is unavailable and provide the exact command for the user to run.

## Common user journeys

**Getting started with CFS:**
Install (`references/user-guide/installation/software-requirements.md` → `references/user-guide/installation/install-cfs.md` → `references/user-guide/installation/set-up-cfs.md` → `references/user-guide/installation/install-extensions.md` → `references/user-guide/installation/package-manager/index.md`) → Create workspace → Build → Flash → Debug

**AI model workflow:**
Create workspace from model → compat check (`cfsutil ai compat`) → profile (`cfsutil ai profile`) → manage in System Planner → generate code → deploy

**System Planner / multi-core configuration:**
Peripheral allocation → Pin config → Clock config → Memory allocation → Manage AI models → Generate code

**CLI-first usage:**
Read `references/user-guide/cfsutil/index.md` first for orientation, then the specific command file. Follow Rule 8 to use bare `cfsutil` when it is on `PATH`, or resolve a version-specific install path otherwise.

**Crash / fault investigation:**
AI Debug Assistant or Core dump analysis (`references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-enable.md` → `references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-analyze.md` → `references/user-guide/debugging/debug-tools/core-dump-analysis/core-dump-interpret.md`)

**Troubleshooting:**
Build issues → `references/user-guide/build-and-flash/troubleshooting.md`; Debug connection issues → `references/user-guide/debugging/troubleshooting.md`; Package manager issues → `references/user-guide/installation/package-manager/troubleshooting-package-manager.md`

**New hire onboarding:**
Start with `references/user-guide/about/purpose.md` and `references/user-guide/about/features.md` for product context, then follow the "Getting started with CFS" journey.
