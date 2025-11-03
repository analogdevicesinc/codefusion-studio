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

import { By } from "selenium-webdriver";

  // Menu Items
  export const peripheralTab: By = By.css(`[data-test='nav-item:peripherals']`);
  export const pinTab: By = By.css('[data-test="nav-item:pinmux"]');
  export const clockTab: By = By.css(`[data-test='nav-item:clockconfig']`);
  export const memoryAllocationTab: By = By.css(`[data-test="nav-item:memory"]`);
  export const generateCodeTab: By = By.css(`[data-test="nav-item:generate"]`);

  // Filters
  export const availableFilterControl: By = By.css(
    "[data-test='filter-control:available']",
  );
  export const conflictFilterControl: By = By.css(
    "[data-test='filter-control:conflicts']",
  );
  export const assignedFilterControl: By = By.css(
    "[data-test='filter-control:assigned']",
  );
  export const allocatedFilterControl: By = By.css(
    "[data-test='filter-control:allocated']",
  );
