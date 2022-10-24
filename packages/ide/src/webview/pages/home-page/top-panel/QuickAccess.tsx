/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import React from "react";

import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";

import { vscode } from "../../../utilities/vscode";

import {
  BrowseExamplesIcon,
  NewFileIcon,
  OpenFileIcon,
  ViewDocumentationIcon,
} from "./icons";

import "./quick-access.scss";
import { OPEN_ELF_FILE } from "../../../../constants";

export const QuickAccess = () => {
  const launchNewProjectWizard = () => {
    vscode.postMessage({ command: "createNewProject" });
  };

  const openExistingProject = () => {
    vscode.postMessage({ command: "openExistingProject" });
  };
  const openExistingConfigFile = () => {
    vscode.postMessage({ command: "openExistingConfigFile" });
  };
  const openElfFile = () => {
    vscode.postMessage({ command: OPEN_ELF_FILE });
  };

  return (
    <div className="quick-access-frame">
      <div className="quick-access-title">Quick access</div>
      <div className="quick-access-links-layout">
        <div className="quick-access-links">
          <VSCodeLink
            className="quick-access-text"
            onClick={launchNewProjectWizard}
          >
            <span className="icon-link-span">
              <NewFileIcon />
              New Project
            </span>
          </VSCodeLink>
        </div>
        <div className="quick-access-links">
          <VSCodeLink
            className="quick-access-text"
            onClick={openExistingProject}
          >
            <span className="icon-link-span">
              <OpenFileIcon />
              Open Project
            </span>
          </VSCodeLink>
        </div>
        <div className="quick-access-links">
          <VSCodeLink
            className="quick-access-text"
            onClick={openExistingConfigFile}
          >
            <span className="icon-link-span">
              <OpenFileIcon />
              Open Config File
            </span>
          </VSCodeLink>
        </div>
        <div className="quick-access-links">
          <VSCodeLink className="quick-access-text" onClick={openElfFile}>
            <span className="icon-link-span">
              <OpenFileIcon />
              Open ELF File
            </span>
          </VSCodeLink>
        </div>
      </div>
    </div>
  );
};
