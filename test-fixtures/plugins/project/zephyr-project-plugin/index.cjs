/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
"use strict";

var os = require("os");

var {
  CfsFeatureScope,
  BasePropertyProvider,
  getGeneratedCodePaths,
} = require("../common/mock-plugin-utils.cjs");

// ── Plugin-specific PropertyProvider (from zephyr-project-plugin) ────────────

const getZephyrBoardName = (board, soc, secure) => {
  switch (board.toLowerCase()) {
    case "ad-apard32690-sl":
      return "apard32690/max32690/m4";
    case "evkit_v1":
      if (soc.toLowerCase() === "max32675c") {
        return "max32675evkit/max32675";
      }
      return `${soc.toLowerCase()}evkit/${soc.toLowerCase()}${
        soc.toLowerCase() === "max32666"
          ? "/cpu0"
          : ["max78000", "max78002", "max32690", "max32655"].includes(
                soc.toLowerCase(),
              )
            ? "/m4"
            : ["max32657", "max32658"].includes(soc.toLowerCase()) &&
                secure === false
              ? "/ns"
              : ""
      }`;
    case "evsys":
      return `${soc.toLowerCase()}evsys`;
    case "fthr":
    case "fthr_reva":
      return `${soc.toLowerCase()}fthr/${soc.toLowerCase()}${
        soc.toLowerCase() === "max32666"
          ? "/cpu0"
          : ["max32657", "max32672", "max32650"].includes(soc.toLowerCase())
            ? ""
            : "/m4"
      }`;
    case "fthr_apps_p1":
      return `${soc.toLowerCase()}fthr_apps/${soc.toLowerCase()}${
        soc.toLowerCase() === "max32657" ? "" : "/m4"
      }`;
    case "ad-swiot1l-sl":
      return "ad_swiot1l_sl";
    default:
      return "";
  }
};

class PropertyProvider extends BasePropertyProvider {
  getProperties(scope, context) {
    const properties = super.getProperties(scope, context);
    if (scope === CfsFeatureScope.Project) {
      const buildSystemProp = properties.find(
        (prop) => prop.id === "BuildSystem",
      );
      if (buildSystemProp?.enum) {
        if (os.platform() === "win32") {
          const makeIndex = buildSystemProp.enum.findIndex(
            (prop) => prop.value === "make",
          );
          if (makeIndex !== -1) {
            buildSystemProp.enum.splice(makeIndex, 1);
          }
        }
      }
    }
    const { boardId, soc, secure } = context ?? {};
    if (boardId && soc) {
      const boardNameProp = properties.find(
        (property) =>
          property.default === "" && property.id === "ZephyrBoardName",
      );
      if (boardNameProp) {
        boardNameProp.default = getZephyrBoardName(boardId, soc, secure);
      }
      const zephyrVersionProp = properties.find(
        (property) => property.id === "ZephyrVersion",
      );
      if (
        zephyrVersionProp &&
        (soc.toLowerCase() === "max32657" || soc.toLowerCase() === "max32658")
      ) {
        zephyrVersionProp.default = "4.3.0";
        zephyrVersionProp.enum?.push({ label: "4.3.0", value: "4.3.0" });
      }
    }
    return properties;
  }
  overrideControls(scope, soc) {
    return super.overrideControls(scope, soc);
  }
}

// ── Plugin class ──────────────────────────────────────────────────────────────

class ZephyrProjectPlugin {
  constructor(cfsPluginInfo) {
    this.cfsPluginInfo = cfsPluginInfo;
    this.propertyProvider = new PropertyProvider(cfsPluginInfo);
  }

  async generateProject(_baseDir, _context) {
    // no-op: project generation is not exercised by ExTester tests
  }

  async generateCode(data, baseDir) {
    return getGeneratedCodePaths(this.cfsPluginInfo, data, baseDir);
  }

  getProperties(scope, context) {
    return this.propertyProvider.getProperties(scope, context);
  }

  overrideControls(scope, soc) {
    return this.propertyProvider.overrideControls(scope, soc);
  }

  async configureProject(_soc, config) {
    return config;
  }

  async configureSystem(config) {
    return config;
  }
}

module.exports = ZephyrProjectPlugin;
