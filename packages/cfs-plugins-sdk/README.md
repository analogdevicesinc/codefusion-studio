# CodeFusion Studio Plugins SDK

The CodeFusion Studio (CFS) Plugins SDK provides everything you need to build plugins that generate workspaces, projects, and configuration code for [CodeFusion Studio](https://www.analog.com/en/resources/evaluation-hardware-and-software/embedded-development-software/codefusion-studio.html).

Plugins are dynamically loaded by CodeFusion Studio at runtime. For more information on how plugins integrate with CodeFusion Studio, refer to the [CodeFusion Studio User Guide](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/plugins/plugin-integration-overview/).

## Table of Contents

- [Dependencies](#dependencies)
- [Installation](#installation)
- [Plugin Structure](#plugin-structure)
- [The .cfsplugin File](#the-cfsplugin-file)
- [Service Interfaces](#service-interfaces)
- [Generic Plugin (template-only plugins)](#generic-plugin-template-only-plugins)
- [Custom Plugins (extending GenericPlugin)](#custom-plugins-extending-genericplugin)
- [Eta Templating](#eta-templating)
- [Plugin Properties](#plugin-properties)
- [Config Patches](#config-patches)
- [Understanding .cfsconfig](#understanding-cfsconfig)
- [Building](#building)
- [Testing](#testing)
- [Using the Plugin in CFS](#using-the-plugin-in-cfs)
- [API Reference](#api-reference)

---

## Dependencies

- [Node.js](https://nodejs.org/) v18 or later
- [yarn](https://yarnpkg.com/)

---

## Installation

The SDK is distributed as part of the [codefusion-studio](https://github.com/analogdevicesinc/codefusion-studio) open-source repository. Tag `v2.2.0` is the first release that includes this package.

> **Coming soon:** `cfs-plugins-sdk` will be published to the npm registry. Once available, installation will simplify to a standard `npm install` or `yarn add`.

`cfs-plugins-sdk` depends on `cfs-types`, which is in the same repository. You must declare a resolution so Yarn resolves `cfs-types` from the same tag as the SDK.

1. **Update your `package.json`:**

   ```json
   "dependencies": {
     "cfs-plugins-sdk": "https://github.com/analogdevicesinc/codefusion-studio.git#workspace=cfs-plugins-sdk&tag=v<version>"
   }
   ```

   Replace `<version>` with the desired release tag (e.g. `2.2.0`).

2. **Update the root `package.json` resolutions:**

   ```json
   "resolutions": {
     "cfs-types@workspace:^": "https://github.com/analogdevicesinc/codefusion-studio.git#workspace=cfs-types&tag=v<version>"
   }
   ```

   > **Important:** Do not add `cfs-types` as a direct dependency — this causes a locator conflict with the resolution above. The resolution entry is sufficient.

3. **Run install:**

   ```bash
   yarn install
   ```

---

## Plugin Structure

Each plugin lives in its own directory. The only required file is the `.cfsplugin` manifest:

```markdown
my-plugin/
├── .cfsplugin            # required — plugin manifest
├── index.ts              # optional (required in a future release) — custom service logic
├── files/                # optional — static files copied as-is
├── templates/            # optional — Eta templates rendered during generation
└── config-patches/       # optional — JSON files that patch .cfsconfig defaults
    └── <soc-id>/
        ├── system.json
        └── <project-id>.json
```

| File/Directory | Purpose |
| --- | --- |
| `.cfsplugin` | Declares plugin metadata, supported SoCs, and services |
| `index.ts` | Exports a class to override or extend default generation behavior. Optional in the current release; will be required in a future release. |
| `files/` | Static assets copied verbatim to the destination |
| `templates/` | Eta templates rendered using the plugin context |
| `config-patches/` | JSON fragments merged into the generated `.cfsconfig` |

---

## The .cfsplugin File

The `.cfsplugin` file is a JSON manifest that defines what your plugin does. In many cases it is the only file you need.

### Key Fields

| Field | Type | Description |
| --- | --- | --- |
| `schemaVersion` | `string` | Schema version for this manifest (e.g. `"1.2.0"`) |
| `pluginId` | `string` | Unique reverse-DNS identifier (e.g. `"com.example.my.plugin"`) |
| `pluginName` | `string` | Human-readable name |
| `pluginDescription` | `string` | Short description |
| `pluginVersion` | `string` | Semantic version of the plugin |
| `pluginApiVersion` | `number` | Plugin API version (use `1`) |
| `author` | `string` | Plugin author |
| `firmwarePlatform` | `string` | Firmware platform this plugin targets (e.g. `"zephyr"`, `"msdk"`) |
| `supportedSocs` | `CfsSocInfo[]` | List of supported SoC + board + package combinations |
| `supportedHostPlatforms` | `string[]` | Optional. Restrict to `"windows"`, `"linux"`, `"osx"` |
| `features` | `object` | Declares `workspace`, `project`, and/or `codegen` services |
| `properties` | `object` | Declares UI properties shown in the System Planner, keyed by scope |

For the full schema, see [`CfsPluginInfo`](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-types/src/types/cfs-plugin-info.ts).

### Minimal Example

```json
{
  "schemaVersion": "1.2.0",
  "pluginId": "com.example.my-project-plugin",
  "pluginName": "My Project Plugin",
  "pluginDescription": "Generates projects for My Platform.",
  "pluginVersion": "1.0.0",
  "pluginApiVersion": 1,
  "author": "Your Name",
  "firmwarePlatform": "my-platform",
  "supportedSocs": [
    {
      "name": "MY-SOC-100",
      "board": "MY-BOARD",
      "package": "tqfp",
      "dataModelVersion": "^1.0.0"
    }
  ],
  "features": {
    "project": {
      "files": [
        { "src": "files/main.c", "dst": "src/main.c" }
      ],
      "templates": [
        { "src": "templates/Makefile.eta", "dst": "Makefile" }
      ]
    }
  },
  "properties": {
    "project": [
      {
        "id": "ProjectName",
        "name": "Project Name",
        "category": "Project Settings",
        "default": "${context.coreId}",
        "type": "string",
        "required": true
      }
    ]
  }
}
```

### File and Template Entries

Each entry in `files` and `templates` supports:

| Field | Description |
| --- | --- |
| `src` | Path relative to the plugin directory |
| `dst` | Destination path. Supports template literal expressions (e.g. `"src/${context.coreId}/main.c"`) |
| `condition` | Optional template literal expression. The file is only included when it evaluates to a truthy string (e.g. `"${context.coreId.includes('m33')}"`) |

---

## Service Interfaces

Service interfaces are defined in [`cfs-types`](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-types/src/types/cfs-services.ts). A plugin can implement any combination of these interfaces.

### CfsWorkspaceGenerationService

Called when CFS creates a new workspace.

```ts
interface CfsWorkspaceGenerationService {
  generateWorkspace(cfsWorkspace: CfsWorkspace): Promise<void>;
}
```

### CfsProjectGenerationService

Called when CFS creates a per-core project within a workspace.

```ts
interface CfsProjectGenerationService {
  generateProject(baseDir: string, context: CfsProject): Promise<void>;
}
```

### CfsCodeGenerationService

Called by the System Planner to regenerate configuration files (e.g. board configs, memory maps) from hardware selections.

```ts
interface CfsCodeGenerationService {
  generateCode(data: Record<string, unknown>, baseDir: string): Promise<string[]>;
}
```

### CfsPropertyProviderService

Returns the list of UI properties shown in the System Planner for a given scope.

```ts
interface CfsPropertyProviderService {
  getProperties(scope: CfsFeatureScope, context?: Record<string, unknown>): CfsPluginProperty[];
}
```

### CfsSocControlsOverrideService

Allows the plugin to add, remove, or modify the SoC controls shown in the System Planner.

```ts
interface CfsSocControlsOverrideService {
  overrideControls(scope: CfsFeatureScope, soc: CfsSocDataModel): Record<string, SocControl[]>;
}
```

### CfsMemoryAccessOverrideService

Specifies which memory access types are available for given part/core combinations.

```ts
interface CfsMemoryAccessOverrideService {
  getMemoryAccessOverrides(
    partName: string,
    coreId: string,
  ): Record<string, string[] | undefined> | undefined;
}
```

### CfsProjectConfigService

Allows the plugin to patch the per-project configuration before it is saved into `.cfsconfig`.

```ts
interface CfsProjectConfigService {
  configureProject(soc: string, config: ConfiguredProject): Promise<ConfiguredProject>;
}
```

### CfsSystemConfigService

Allows the primary-core plugin to patch the full system configuration before it is saved.

```ts
interface CfsSystemConfigService {
  configureSystem(config: CfsConfig): Promise<CfsConfig>;
}
```

---

## Generic Plugin (template-only plugins)

> **Deprecation notice:** Plugins that consist of only a `.cfsplugin` file with no `index.ts` are currently in deprecation. Support for this pattern will be removed in a future release. New plugins should always include an `index.ts` that explicitly extends [`GenericPlugin`](./src/generic/cfs-generic-plugin.ts).

If your plugin contains only a `.cfsplugin` file and no `index.ts`, CFS automatically constructs it using the built-in [`GenericPlugin`](./src/generic/cfs-generic-plugin.ts) class. This handles the full generation lifecycle using the [Eta](https://eta.js.org/docs/) templating engine:

- **`files` entries** are copied verbatim to the destination, with `dst` and `condition` evaluated as template literals.
- **`templates` entries** are rendered using Eta and written to the evaluated `dst` path.

---

## Custom Plugins (extending GenericPlugin)

When you need to override or extend the default behavior of one or more services, create an `index.ts` that exports a class extending [`GenericPlugin`](./src/generic/cfs-generic-plugin.ts).

This gives you access to all default service implementations while letting you override only what you need.

### Example: Overriding memory access behavior

```ts
import { GenericPlugin } from "cfs-plugins-sdk";

class MyProjectPlugin extends GenericPlugin {
  override getMemoryAccessOverrides(
    partName: string,
    coreId: string
  ): Record<string, string[] | undefined> | undefined {
    // Disable memory access selection for a specific core
    if (coreId === "FX") {
      return {
        RAM: [],
        Flash: [],
      };
    }

    // Fall back to default behavior for all other cores
    return super.getMemoryAccessOverrides(partName, coreId);
  }
}

export default MyProjectPlugin;
```

### Overriding generation services

You can override any combination of the generation services. Each `override` method receives the same arguments as the interface definition and can call `super` to delegate to the default implementation:

```ts
import { GenericPlugin } from "cfs-plugins-sdk";
import type { CfsProject } from "cfs-types";

class MyProjectPlugin extends GenericPlugin {
  override async generateProject(
    baseDir: string,
    context: CfsProject
  ): Promise<void> {
    // Custom pre-generation logic here
    await super.generateProject(baseDir, context);
    // Custom post-generation logic here
  }
}

export default MyProjectPlugin;
```

### Reusing SDK components directly

For more complex scenarios — such as using a different templating engine for one service — you can import the SDK's individual generator components rather than extending `GenericPlugin`:

```ts
import {
  CfsEtaProjectGenerator,
  CfsEtaCodeGenerator,
  CfsJsonProjectConfig,
  CfsJsonSystemConfig,
} from "cfs-plugins-sdk";
import type {
  CfsPluginInfo,
  CfsProjectGenerationService,
  CfsCodeGenerationService,
  CfsProjectConfigService,
  CfsSystemConfigService,
  CfsProject,
  CfsConfig,
  ConfiguredProject,
} from "cfs-types";
import path from "path";

class MyProjectPlugin
  implements
    CfsProjectGenerationService,
    CfsCodeGenerationService,
    CfsProjectConfigService,
    CfsSystemConfigService
{
  private projectGenerator: CfsEtaProjectGenerator;
  private codeGenerator: CfsEtaCodeGenerator;
  private projectConfig: CfsJsonProjectConfig;
  private systemConfig: CfsJsonSystemConfig;

  constructor(pluginInfo: CfsPluginInfo) {
    const pluginDir = path.dirname(pluginInfo.pluginPath);
    this.projectGenerator = new CfsEtaProjectGenerator(pluginDir, pluginInfo.features.project);
    this.codeGenerator = new CfsEtaCodeGenerator(pluginDir, pluginInfo.features.codegen);
    this.projectConfig = new CfsJsonProjectConfig(pluginInfo);
    this.systemConfig = new CfsJsonSystemConfig(pluginInfo);
  }

  async generateProject(baseDir: string, context: CfsProject): Promise<void> {
    return this.projectGenerator.generateProject(baseDir, context);
  }

  async generateCode(data: Record<string, unknown>, baseDir: string): Promise<string[]> {
    return this.codeGenerator.generateCode(data, baseDir);
  }

  async configureProject(soc: string, config: ConfiguredProject): Promise<ConfiguredProject> {
    return this.projectConfig.configureProject(soc, config);
  }

  async configureSystem(config: CfsConfig): Promise<CfsConfig> {
    return this.systemConfig.configureSystem(config);
  }
}

export default MyProjectPlugin;
```

### Available SDK exports

| Export | Description |
| --- | --- |
| `GenericPlugin` | Base class implementing all services using Eta and JSON config patches |
| `PropertyProvider` | Manages plugin properties and SoC control overrides |
| `CfsEtaWorkspaceGenerator` | Generates workspace structure using Eta templates |
| `CfsEtaProjectGenerator` | Generates per-core project structure using Eta templates |
| `CfsEtaCodeGenerator` | Generates code files using Eta templates |
| `CfsSSPlusProjectGenerator` | Executes SigmaStudio+ project creation (SHARC-based platforms) |
| `CfsJsonProjectConfig` | Reads `config-patches/<soc>/<project-id>.json` to patch project config |
| `CfsJsonSystemConfig` | Reads `config-patches/<soc>/system.json` to patch system config |
| `CfsSocControlsOverride` | Filters and modifies SoC controls by part name pattern |
| `evalNestedTemplateLiterals` | Evaluates template literal strings with a given context |

---

## Eta Templating

Templates in the `templates/` directory are rendered using the [Eta](https://eta.js.org/docs/) templating engine. The template context (`it`) contains everything from the plugin context — SoC data, board selection, project properties, and more.

### Basic syntax

```eta
/* Generated for <%= it.context.soc %> */
#define BOARD_NAME "<%= it.context.boardName %>"
```

### Conditionals and loops

```eta
<% if (it.context.coreId.includes('m33')) { %>
#include "arm_math.h"
<% } %>
```

### Template context variables

Common variables available in templates:

| Variable | Description |
| --- | --- |
| `it.context.soc` | SoC name (e.g. `"MAX32690"`) |
| `it.context.coreId` | Core identifier (e.g. `"CM4"`, `"FX"`) |
| `it.context.boardName` | Board name |
| `it.context.package` | Package variant |
| `it.context.workspaceName` | Name of the workspace being created |
| `it.context.cfsconfig` | Full `.cfsconfig` object |
| `it.context.projectId` | Project identifier within the workspace |

### Eta partials

The SDK provides built-in global partials you can include in any template:

```eta
<%~ includeFile('./copyright-header') %>
```

Available built-in partials include helpers for copyright headers, board name normalization, SoC initialization, and toolchain-specific utilities.

You can also define your own partials inside your plugin's `templates/` directory and include them by relative path.

### `dst` and `condition` template expressions

The `dst` and `condition` fields in `.cfsplugin` are evaluated as JavaScript template literals (not Eta). Use `${}` syntax:

```json
{
  "src": "templates/settings.json.eta",
  "dst": ".vscode/settings.json",
  "condition": "${context.coreId.toLowerCase().includes('m33')}"
}
```

---

## Plugin Properties

Plugin properties are fields shown in the System Planner UI during workspace or project setup. Their values are saved into `.cfsworkspace` or `.cfsconfig` and are available at code generation time.

### Declaring properties in .cfsplugin

```json
"properties": {
  "project": [
    {
      "id": "BuildSystem",
      "name": "Build System",
      "category": "Project Settings",
      "description": "Select the build system for this project.",
      "type": "string",
      "default": "make",
      "enum": [
        { "label": "Make", "value": "make" },
        { "label": "CMake", "value": "cmake" }
      ],
      "required": true
    },
    {
      "id": "EnableRTOS",
      "name": "Enable RTOS",
      "category": "Project Settings",
      "type": "boolean",
      "default": "false",
      "condition": "${context.buildSystem === 'make'}"
    }
  ]
}
```

### CfsPluginProperty fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier used to reference this property in templates |
| `name` | `string` | Label shown in the UI |
| `description` | `string` | Optional tooltip text |
| `category` | `string` | Groups related properties together in the UI |
| `type` | `string` | One of `"string"`, `"integer"`, `"float"`, `"boolean"`, `"array"` |
| `default` | `string` | Default value; supports template literal expressions |
| `enum` | `{ label, value }[]` | Restricts input to a dropdown list |
| `required` | `boolean` | If true, CFS validates that a value is set |
| `readonly` | `boolean` | If true, the property is hidden from the user |
| `placeholder` | `string` | Placeholder text shown in the input field |
| `condition` | `string` | Template literal expression; property is shown only when truthy |

For the full type definition, see [`CfsPluginProperty`](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-types/src/types/cfs-plugin-property.ts).

### Programmatic properties

To generate properties dynamically at runtime, implement `CfsPropertyProviderService` in `index.ts` instead of (or in addition to) the declarative `properties` block:

```ts
import { GenericPlugin } from "cfs-plugins-sdk";
import type { CfsFeatureScope, CfsPluginProperty } from "cfs-types";

class MyPlugin extends GenericPlugin {
  override getProperties(
    scope: CfsFeatureScope,
    context?: Record<string, unknown>
  ): CfsPluginProperty[] {
    const base = super.getProperties(scope, context);
    if (scope === "project") {
      return [
        ...base,
        {
          id: "DynamicOption",
          name: "Dynamic Option",
          type: "string",
          default: "auto",
          required: false,
        },
      ];
    }
    return base;
  }
}

export default MyPlugin;
```

---

## Config Patches

Config patches allow a plugin to merge default values into the generated `.cfsconfig` without writing custom TypeScript logic. Place JSON files under `config-patches/` using the following layout:

```markdown
config-patches/
└── <soc-id>/               # e.g. "max32690", "adsp-sc835w"
    ├── system.json         # patches the top-level system config
    └── <project-id>.json   # patches a specific project entry (e.g. "cm4.json")
```

`CfsJsonSystemConfig` reads `system.json` and merges its fields onto the generated `CfsConfig` object.
`CfsJsonProjectConfig` reads `<project-id>.json` and merges its fields onto the matching `ConfiguredProject` entry.

These are used automatically when your plugin class includes these components — either via `GenericPlugin` or directly.

### Example: `config-patches/max32690/system.json`

```json
{
  "ClockNodes": [
    { "Id": "IPO", "Frequency": 100000000 }
  ]
}
```

---

## Understanding .cfsconfig

The `.cfsconfig` file captures the full hardware and project configuration for a CFS workspace. It is generated by CFS from user selections and plugin-provided data.

```json
{
  "Soc": "MAX32690",
  "BoardName": "AD-APARD32690-SL",
  "Package": "wlp",
  "Timestamp": "2025-02-28T12:29:03.185Z",
  "Projects": [
    {
      "CoreId": "CM4",
      "ProjectId": "cm4",
      "PluginId": "com.example.my-project-plugin",
      "PluginVersion": "1.0.0",
      "FirmwarePlatform": "my-platform",
      "PlatformConfig": {},
      "Peripherals": [],
      "Partitions": []
    }
  ],
  "Pins": [],
  "ClockNodes": []
}
```

Plugins interact with `.cfsconfig` through:

- **`properties`** — values entered in the System Planner are saved under `PlatformConfig`
- **`CfsSystemConfigService.configureSystem()`** — patches the top-level `CfsConfig` object
- **`CfsProjectConfigService.configureProject()`** — patches individual `ConfiguredProject` entries
- **`config-patches/`** — declarative JSON overrides applied by `CfsJsonSystemConfig` / `CfsJsonProjectConfig`

> **Note:** The structure of `.cfsconfig` may evolve in future releases. Avoid hardcoding assumptions about its format in plugin logic.

---

## Building

Plugins are authored in TypeScript and compiled to CommonJS. A minimal `tsconfig.json` for a plugin project:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "declaration": true,
    "strict": true
  },
  "include": ["src/**/*", "plugins/**/*.ts"]
}
```

To build:

```bash
yarn build
```

The compiled output (`.cjs` files) is what CFS loads at runtime. Ensure your build tool emits CommonJS — the VS Code extension host does not support ES modules.

---

## Testing

### Testing your plugin

We recommend using [Mocha](https://mochajs.org/) to test your plugin. A typical test structure:

```markdown
tests/
└── unit-tests/
    └── plugins/
        └── my-plugin/
            └── my-plugin.test.ts
```

A basic plugin test:

```ts
import { expect } from "chai";
import MyProjectPlugin from "../../plugins/my-plugin/index.js";

describe("MyProjectPlugin", () => {
  it("generates a project without errors", async () => {
    const plugin = new MyProjectPlugin(mockPluginInfo);
    await expect(
      plugin.generateProject("/tmp/test-output", mockProjectContext)
    ).to.be.fulfilled;
  });
});
```

Run tests with:

```bash
yarn test
```

---

## Using the Plugin in CFS

After building your plugin, add its output directory to the `cfs.plugins.searchDirectories` setting in your VS Code `settings.json`:

```json
"cfs.plugins.searchDirectories": [
  "${userHome}/cfs/plugins",
  "/path/to/my-plugin-repo/dist"
]
```

CFS scans these directories at startup and loads any `.cfsplugin` files it finds. The plugin's `index.cjs` (if present) is loaded from the same directory as the `.cfsplugin` file.

> **Tip:** Update `pluginVersion` in your `.cfsplugin` whenever you make changes — CFS uses the version to detect updates and re-register the plugin.

---

## API Reference

| File | Description |
| --- | --- |
| [`src/index.ts`](./src/index.ts) | Public SDK exports |
| [`src/generic/cfs-generic-plugin.ts`](./src/generic/cfs-generic-plugin.ts) | `GenericPlugin` base class |
| [`src/generic/components/`](./src/generic/components/) | Reusable generator components |
| [`src/generic/utilities/`](./src/generic/utilities/) | Internal utilities (Eta, fs, template literals) |

Type definitions (from the `cfs-types` package):

| File | Description |
| --- | --- |
| [`cfs-plugin-info.ts`](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-types/src/types/cfs-plugin-info.ts) | `CfsPluginInfo` — full `.cfsplugin` schema |
| [`cfs-services.ts`](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-types/src/types/cfs-services.ts) | All service interface definitions |
| [`cfs-plugin-property.ts`](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-types/src/types/cfs-plugin-property.ts) | `CfsPluginProperty` — property field schema |
