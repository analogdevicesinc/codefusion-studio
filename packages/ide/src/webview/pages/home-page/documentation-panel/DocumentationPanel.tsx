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

import { default as DocumentLinks } from "./documentation.json";

import "./documentation-panel.scss";

export const DocumentationPanel = () => {
  return (
    <div className="documentation-panel">
      <h2>Documentation related to your projects</h2>
      {DocumentLinks.map((document) => (
        <VSCodeLink key={document.title} href={document.link}>
          {document.title}
        </VSCodeLink>
      ))}
      <VSCodeLink href="https://www.analog.com/">See more...</VSCodeLink>
    </div>
  );
};
