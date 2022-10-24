/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import "../styles/new-project-wizard-page.scss";
import { FormDataProvider } from "./form-data-context";
import { vscode } from "../../../utilities/vscode";
import { NewProjectWizard } from "./new-project-wizard";

export const NewProjectWizardPage = () => {
  const [defaultLocation, setDefaultLocation] = useState("");
  const messageHandler = (
    event: MessageEvent<{
      command: string;
      defaultLocation?: string;
      launch?: boolean;
    }>
  ) => {
    switch (event.data.command) {
      case "getDefaultLocation":
        if (event.data.defaultLocation !== undefined)
          setDefaultLocation(event.data.defaultLocation);
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("message", messageHandler);
    vscode.postMessage({
      command: "getDefaultLocation",
    });
  }, []);

  return (
    <div className="new-project-wizard-tab">
      <FormDataProvider>
        <NewProjectWizard
          defaultLocation={defaultLocation}
          />
        </FormDataProvider>
    </div>
  );
};
