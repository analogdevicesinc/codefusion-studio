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

import Tooltip, {
  Direction,
} from "../../webviews/common/components/tooltip/Tooltip";

import {
  TechSupportIcon,
  EngineerZoneIcon,
  GitHubIcon,
  HelpIcon,
} from "./icons";

import "./navigation-bar.scss";
const HelpTooltip = "Online help";
const EngineerZoneTooltip = "Engineer Zone";
const GitHubTooltip = "GitHub";
const TechSupportTooltip = "Tech Support";

export const NavigationBar = () => {
  return (
    <div className="navigation-bar">
      <div className="navigation-boxes-container">
        <Tooltip title={HelpTooltip} direction={Direction.Left}>
          <a
            href="https://developer.analog.com/docs/codefusion-studio/1.0.0/"
            className="left-border"
          >
            <HelpIcon />
          </a>
        </Tooltip>
        <Tooltip title={EngineerZoneTooltip} direction={Direction.Left}>
          <a href="https://ez.analog.com/">
            <EngineerZoneIcon />
          </a>
        </Tooltip>
        <Tooltip title={TechSupportTooltip} direction={Direction.Left}>
          <a href=" https://support.analog.com/en-US/technical-support/create-case-techsupport">
            <TechSupportIcon />
          </a>
        </Tooltip>
        <Tooltip title={GitHubTooltip} direction={Direction.Left}>
          <a
            href="https://github.com/analogdevicesinc/codefusion-studio"
            className="right-border"
          >
            <GitHubIcon />
          </a>
        </Tooltip>
      </div>
    </div>
  );
};
