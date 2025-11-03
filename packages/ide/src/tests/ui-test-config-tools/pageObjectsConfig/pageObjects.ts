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

export class Locatorspaths {
  public spioSignal: By = By.xpath("//*[@data-test='accordion:SPI0']");

  public spioSignalAssign: By = By.xpath(
    "//*[@data-test='peripheral-signal-SPI0-chevron']",
  );

  public allocateArm: By = By.xpath(
    "//*[@data-test='core-corepart_01jrdgezrce69rsqvja125h3v2-container']",
  );

  public allocateRiscv: By = By.xpath(
    "//*[@data-test='core-corepart_01jrdgezrce6a8zq3xaqac6wkg-container']",
  );

  public GPIO0Signal: By = By.xpath(
    "//*[@data-test='peripheral-signal-P0.7-container']",
  );

  public configureSettings: By = By.xpath(
    "//*[@id='SPI0']//*[@data-test='peripheral-assignment:config']",
  );

  public GPIO0ConfigureSettingsArm: By = By.xpath(
    "//*[@id='GPIO0']//*[@data-test='peripheral-assignment:config']",
  );

  public managePinsAssignment: By = By.xpath(
    "//*[@data-test='config-section:manage-pin-assignments']",
  );

  public GPIO0P08: By = By.xpath("//*[@data-test='GPIO0-P0.8-span']");

  public RiscvConfig: By = By.xpath(
    "//*[@data-test='signal-assignment:config']",
  );

  public RiscvSignalDelete: By = By.xpath(
    "//*[@data-test='allocated-core-card:corepart_01jrdgezrce69rsqvja125h3v2:delete-icon']",
  );

  public GPIO0Chevron: By = By.xpath(
    "//*[@data-test='core:corepart_01jrdgezrce69rsqvja125h3v2:allocation:GPIO0:chevron']",
  );

  public clockTab: By = By.css(`[data-test='nav-item:clockconfig']`);
  public peripheralTab: By = By.css(`[data-test='nav-item:peripherals']`);

  public spioToggleCS1Pin: By = By.xpath("//*[@data-test='SPI0-CS1-span']");
  public spioToggleMISOPin: By = By.xpath("//*[@data-test='SPI0-MISO-span']");
  public spioToggleMOSIPin: By = By.xpath("//*[@data-test='SPI0-MOSI-span']");
  public spioToggleSCKPin: By = By.xpath("//*[@data-test='SPI0-SCK-span']");

  public pinMenu: By = By.css('[data-test="nav-item:pinmux"]');

  public memoryMenu: By = By.css('[data-test="nav-item:memory"]');

  public availableFilterControl: By = By.css(
    "[data-test='filter-control:available']",
  );

  public conflictFilterControl: By = By.css(
    "[data-test='filter-control:conflicts']",
  );

  public assignedFilterControl: By = By.css(
    "[data-test='filter-control:assigned']",
  );

  public pinDropdown(pinName: string): By {
    return By.css(`[data-test="accordion:${pinName}"]`);
  }

  public pinToggle(peripheralName: string, signalName: string): By {
    return By.css(`[data-test="${peripheralName}-${signalName}-span"]`);
  }

  public assignedPinsList: By = By.css("[data-test='pinmux:peripheral-navigation'] span");

  public pinConfigButton(peripheralName: string, signalName: string): By {
    return By.css(
      `section[data-test="${peripheralName}-${signalName}"] > div[class*='configButtonContainer']`,
    );
  }

  public createPartitionButton: By = By.css(
    "[data-test='create-partition-btn']",
  );

  public memoryTypeDropdown: By = By.css("[data-test='memory-type-dropdown']");

  public memoryTypeSelector(memoryOption: string): By {
    return By.css(`[data-test="${memoryOption}"]`);
  }

  public partitionNameTextBox: By = By.css(
    "[data-test='partition-name-control-input']",
  );

  public assignedCoresDropdown: By = By.css(
    "[data-test='assigned-cores-multiselect']",
  );

  public assignedCoresSelector(coreName: string): By {
    return By.css(`[data-test="${coreName}"]`);
  }

  public RVCoreDropdown: By = By.id("core-permissionRV-proj-controlDropdown");

  public CM4CoreDropdown: By = By.id("core-permissionCM4-proj-controlDropdown");

  public CM4corePermission(CM4Permission: string): By {
    return By.css(`[data-value="${CM4Permission}"]`);
  }

  public RVcorePermission(RVPermission: string): By {
    return By.css(`[data-value="${RVPermission}"]`);
  }

  public pluginCoreText(index: number): By {
    return By.xpath(
      `(//vscode-text-field[@data-test="plugin-options-form:control-NAME_OVERRIDE-control-input"])[${index}]`,
    );
  }

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
    return By.xpath(`(//svg[@data-test='delete-partition-btn'])[${index}]`);
  }

  public deletePartitionButton: By = By.css(
    "[data-test='delete-partition-btn']",
  );
}
