/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import { By } from "vscode-extension-tester";

export const partitionDetailsDropdowns: By = By.css(
  `[data-test="partition-details-chevron"]`,
);
export const cm4PartitionCardTitles: By = By.css(
  `[data-test="CM4-partition-card-title"] `,
);
export const createPartitionButton: By = By.css(
  "[data-test='create-partition-btn']",
);
export const deletePartitionButton: By = By.css(
  "[data-test='delete-partition-btn']",
);

export async function partitionDetailsChevron(index: number): Promise<By> {
  return By.xpath(`(//div[@data-test='partition-details-chevron'])[${index}]`);
}

export async function getDeletePartitionButton(index: number): Promise<By> {
  return By.xpath(`(//*[@data-test='delete-partition-btn'])[${index}]`);
}

export async function getEditPartitionButton(index: number): Promise<By> {
  return By.xpath(`(//*[@data-Test='edit-partition-btn'])[${index}]`);
}
