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

import React, { useEffect, useState } from "react";

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

import { vscode } from "../../../utilities/vscode";

import "./title-panel.scss";

export interface Message {
  command: string;
  data: boolean;
}

export const TitlePanel = () => {
  const [isChecked, setIsChecked] = useState<boolean>(true);
  const messageHandler = (event: MessageEvent<Message>) => {
    switch (event.data.command) {
      case "setCheckboxState":
        setIsChecked(event.data.data);
        break;
    }
  };
  useEffect(() => {
    vscode.postMessage({
      command: "requestHomePageCheckboxState",
    });

    window.addEventListener("message", messageHandler);
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCheckboxChange = (event: any) => {
    const newState = event.target.checked;
    setIsChecked(newState);
    vscode.postMessage({
      command: "showHomePageAtStartupCheckbox",
      data: newState,
    });
  };
  return (
    <div className="title-frame">
      <div className="title-text">Welcome to CodeFusion Studio</div>
      <div className="checkbox-frame">
        <div className="checkbox-layer">
          <VSCodeCheckbox
            checked={isChecked}
            className="checkbox"
            onChange={handleCheckboxChange}
          ></VSCodeCheckbox>
          <div className="checkbox-text">Show at startup</div>
        </div>
      </div>
    </div>
  );
};
