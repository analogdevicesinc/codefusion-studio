---
description: Additional considerations for using the Zephyr RTOS in CodeFusion Studio.
author: Analog Devices
date: 2026-10-13
---

# Zephyr RTOS projects

## Modify west commands

CodeFusion Studio generates a default `west build` command for your current project (ex.: `west build -b apard32690/max32690/m4`).

While the default west build command covers most common build cases, there are situations where you need to pass additional parameters to west.

Examples of common cases where you want to alter the west build command include:

- Setting one-off KConfig parameters that you only want to use for one build:
    `-DCONFIG_FAULT_DUMP=1`
- Associating an optional config overlay file with your build:
    `-DOVERLAY_CONFIG=my-overlay.conf`
- Specifying a 'shield' to use with your development board:
    `-DSHIELD=shield_name`

There are two main ways you can customize the west build command in CodeFusion Studio:

1. [Modify the task](tasks.md#modify-build-tasks) associated with the 'build' action.
2. Manually enter a west command using [The CFS Terminal](cfs-terminal.md).

### Example one

To perform a west build with additional `OVERLAY_CONFIG` parameters, tell the build system to include this config file in the build operation by passing the parameters on the CFS terminal as follows:

```bash
west build -p auto -b apard32690/max32690/m4 -- -DOVERLAY_CONFIG=my-overlay.conf
```

### Example two

To debug an application and receive more details when hitting a fault handler, do a one-off build with the `CONFIG_FAULT_DUMP` KConfig flag set:

```bash
west build -p auto -b apard32690/max32690/m4 -- -DCONFIG_FAULT_DUMP=1
```

!!! note
    The double dash `--` in the `west` command line will pass any following arguments directly to **CMake**.

## Edit west.yml in the West Editor

To view and edit the projects, groups, and group filter of a `west.yml` manifest as cards instead of YAML, use the [West Editor](../developer-tools/west-editor.md).

## Add an installed package to a west workspace

CodeFusion Studio provides a `cfspkg://` Git protocol, so `west` can clone a package installed with the Package Manager into your own application. In the `west.yml` manifest, set the project `url` to `cfspkg://<name>/<version>`:

```yaml
manifest:
  projects:
    - name: my-project
      url: cfspkg://my-package/1.0.0
      revision: main # Example only. Replace with a ref that exists in the Git repository included in the package.
```

When you run `west update` from the [CFS Terminal](cfs-terminal.md), or from a [custom task](../cfsutil/tasks.md#define-tasks-for-cli-use) that you run with `cfsutil tasks run`, Git resolves the URL to the installed package and clones it into your workspace. The `revision` is a branch, tag, or commit in the package's Git repository. It is separate from the package version in the URL, and `west update` fails if the repository doesn't have it.

Before you use this protocol:

- Install the exact package version with the [Package Manager](../installation/package-manager/index.md) or `cfsutil pkg install <name>/<version>`. If the version isn't installed, the clone fails and the error message shows the install command. To find the name and version of an installed package, use the [Packages view](../installation/package-manager/view-installed-packages.md) in the CodeFusion Studio sidebar, or run `cfsutil pkg list`.
- The package must be a Git repository. Packages that aren't Git repositories aren't supported.

## Add compiler arguments

To pass specific compiler switches to the build system, use **zephyr_cc_option** in **CMakeLists.txt**:

``` kconfig
  zephyr_cc_option(-fstack-usage)
```
