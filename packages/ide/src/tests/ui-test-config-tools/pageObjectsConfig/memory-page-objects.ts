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

// Will require some cleanup in the future

import { By, WebDriver, Key } from "selenium-webdriver";

export class Locatorspaths {
  public memoryMenu: By = By.css('[data-test="nav-item:memory"]');

  public createPartitionButton: By = By.css(
    "[data-test='create-partition-btn']",
  );

  public memoryTypeDropdown: By = By.css("[data-test='memory-type-dropdown']");

  public memoryTypeSelector(memoryOption: "Flash" | "RAM"): By {
    return By.css(`[data-test="${memoryOption}"]`);
  }

  public partitionNameTextBox: By = By.css(
    "[data-test='partition-name-control-input'][type='text']",
  );

  public async setPartitionName(driver: WebDriver, name: string) {
    const input = await driver.findElement(this.partitionNameTextBox);

    await input.sendKeys(Key.chord(Key.CONTROL, "a"));
    await input.sendKeys(Key.DELETE);

    await input.sendKeys(name);
  }

  public assignedCoresDropdown: By = By.css(
    "[data-test='assigned-cores-multiselect']",
  );

  public assignedCoresSelector(coreName: string): By {
    return By.css(`[data-test="${coreName}"]`);
  }

  public RVCoreDropdown: By = By.id("core-permissionRV-proj-controlDropdown");

  public CM4CoreDropdown: By = By.id("core-permissionCM4-proj-controlDropdown");

  public cM4corePermission(CM4Permission: "R" | "R/W"): By {
    return By.css(`[data-value="${CM4Permission}"]`);
  }

  public rVcorePermission(RVPermission: string): By {
    return By.css(`[data-value="${RVPermission}"]`);
  }

  public pluginCoreText(index: number): By {
    return By.xpath(
      `(//vscode-text-field[@data-test="plugin-options-form:control-NAME_OVERRIDE-control-input"])[${index}]`,
    );
  }

  public chosenControlInput: By = By.css(
    "[data-test='plugin-options-form:control-CHOSEN-control-input']",
  );

  public labelControlInput: By = By.css(
    "[data-test='plugin-options-form:control-LABEL-control-input']",
  );

  public startAddress: By = By.css('[data-test="start-address"] input');

  public sizeStepper: By = By.css("[data-test='size-stepper'] input");

  public createConfiguredPartition: By = By.css(
    "[data-test='create-partition-button']",
  );

  public baseBlockSelector: By = By.css("[data-test='base-block-dropdown']");

  public flash1Option: By = By.css("[data-test='flash1']");

  public partitionDetailsChevron(index: number): By {
    return By.xpath(
      `(//div[@data-test='partition-details-chevron'])[${index}]`,
    );
  }

  public getDeletePartitionButton(index: number): By {
    return By.xpath(`(//*[@data-test='delete-partition-btn'])[${index}]`);
  }

  public deletePartitionButton: By = By.css(
    "[data-test='delete-partition-btn']",
  );

  public getEditPartitionButton(index: number): By {
    return By.xpath(`(//*[@data-Test='edit-partition-btn'])[${index}]`);
  }
}
