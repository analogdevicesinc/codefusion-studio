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

var {
  BasePropertyProvider,
  getGeneratedCodePaths,
} = require("../common/mock-plugin-utils.cjs");

// ── Plugin-specific PropertyProvider (from msdk-project-plugin) ──────────────

const getMsdkBoardName = (board, soc) => {
  switch (board.toLowerCase()) {
    case "evkit_v1":
      return "EvKit_V1";
    case "fthr":
      if (soc === "MAX32690") {
        return "FTHR";
      }
      if (soc === "MAX78000") {
        return "FTHR_RevA";
      }
      if (soc === "MAX32650") {
        return "FTHR_APPS_A";
      }
      return "FTHR_Apps_P1";
    case "ad-apard32690-sl":
    case "apard":
      return "APARD";
    case "ad-swiot1l-sl":
      return "AD-SWIOT1L-SL";
    case "evsys":
      return "EVSYS";
    default:
      return "";
  }
};

class PropertyProvider extends BasePropertyProvider {
  getProperties(scope, context) {
    const properties = super.getProperties(scope, context);
    const { boardId, soc } = context ?? {};
    if (boardId && soc) {
      const boardNameProp = properties.find(
        (property) =>
          property.default === "" && property.id === "MsdkBoardName",
      );
      if (boardNameProp) {
        boardNameProp.default = getMsdkBoardName(boardId, soc);
      }
    }
    return properties;
  }
}

// ── Plugin class ──────────────────────────────────────────────────────────────

class MsdkProjectPlugin {
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
    // identity: config-patches are not needed by ExTester tests
    return config;
  }

  async configureSystem(config) {
    // identity: system patches are not needed by ExTester tests
    return config;
  }
}

module.exports = MsdkProjectPlugin;
