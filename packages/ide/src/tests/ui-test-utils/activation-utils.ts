/* eslint-disable no-unused-expressions */
/**
 *
 * Copyright (c) 2023-2025 Analog Devices, Inc.
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

import { expect } from "chai";

import { INFO } from "../../messages";

import { getNotificationByMessage } from "./view-utils";

/**
 * Select the given action on the "Configure Workspace" notification
 * @param action - The action to select. Either "Yes", "No", "Never", or undefined
 * @returns a void promise
 */
export async function configureWorkspace(action?: string | undefined) {
  const notification = await getNotificationByMessage(INFO.configureWorkspace);
  expect(notification, "Did not find CFS configure workspace notification").to
    .not.be.null;
  if (notification === null) {
    return;
  }

  if (action !== undefined) {
    await notification.takeAction(action);
  }
}
