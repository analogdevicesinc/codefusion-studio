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

import { useContext } from "react";

import "../styles/new-project-wizard.scss";
import React from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FormDataContext } from "./form-data-context";
import { vscode } from "../../../utilities/vscode";
import { CreateProjectModalPage } from "./new-project-modal";

export type newProjectWizardProps = {
  readonly defaultLocation: string;
};

export function NewProjectWizard({ defaultLocation }: newProjectWizardProps) {
  const context = useContext(FormDataContext);
  if (!context)
    throw new Error("useFormData must be used within a FormDataProvider");

  const onFinish = () => {
    if (
      context.formData.projectLocation === undefined ||
      context.formData.projectLocation === ""
    ) {
      context.formData.projectLocation = defaultLocation;
    }

    if (
      context.formData.projectName === undefined ||
      context.formData.projectName === ""
    ) {
      context.formData.projectName = "MyProject";
    }

    vscode.postMessage({
      command: "submitNewProjectForm",
      data: context.formData,
    });
  };

  const onCancel = () => {
    vscode.postMessage({ command: "closeNewProjectWizardTab" });
  };

  return (
    <div className="container">
      <div className="body">
        <CreateProjectModalPage defaultNewProjectLocation={defaultLocation} />
      </div>
      <div className="footer">
        <VSCodeButton appearance="secondary" onClick={onCancel}>
          Cancel
        </VSCodeButton>
        <VSCodeButton
          disabled={
            !!context.formData.projectNameError ||
            context.formData.soc === undefined ||
            context.formData.board === undefined ||
            context.formData.socPackage === undefined ||
            context.formData.firmwarePlatform === "" ||
            context.formData.projectLocationError ||
            context.formData.template === undefined ||
            context.formData.projectLocationSpaceError
          }
          onClick={onFinish}
        >
          Generate
        </VSCodeButton>
      </div>
    </div>
  );
}
