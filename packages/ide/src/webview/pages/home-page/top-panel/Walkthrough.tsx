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

import { vscode } from "../../../utilities/vscode";

import { WalkthroughIcon } from "./icons";

import "./walkthrough.scss";

export const Walkthrough = () => {
  const openWalkthrough = () => {
    vscode.postMessage({ command: "openWalkthrough" });
  };
  return (
    <div className="walkthrough-frame">
      <div className="walkthrough-title">Walkthrough</div>
      <div className="walkthrough-contentbox">
        <div className="walkthrough-logo">
          <WalkthroughIcon />
        </div>
        <div className="walkthrough-textbox-frame" onClick={openWalkthrough}>
          <div className="walkthrough-textbox-layer-one">
            <div className="walkthrough-textbox-layer-two">
              <div className="walkthrough-textbox">
                <div className="walkthrough-textbox-title">
                  Get started with the CodeFusion Studio VS Code extension
                </div>
                <div className="walkthrough-textbox-text">
                  Set up your environment and create your first project.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
