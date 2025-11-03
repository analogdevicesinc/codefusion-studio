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
  public settingstext: By = By.xpath(
    "//span[@class='setting-item-label' and contains(text(),'Open At Startup')]",
  );

  public newworkspace: By = By.xpath(
    "//*[contains(@class,'monaco-highlighted-label') and text()= 'New Workspace']",
  );

  public selectorSoc: By = By.xpath(
    "//*[@id='control-input' and contains(@placeholder, 'Search SoCs')]",
  );

  public spioSignal: By = By.xpath("//*[@data-test='accordion:SPI0']");

  public spioSignalAssign: By = By.xpath(
    "//*[@data-test='peripheral-signal-SPI0-container']",
  );

  public allocateArm: By = By.xpath(
    "//*[@data-test='core-corepart_01jrdgezrce69rsqvja125h3v2-container']",
  );

  public configureSettings: By = By.xpath(
    "(//*[@data-test='peripheral-assignment:config'])[2]",
  );

  public managePinsAssignment: By = By.xpath(
    "//*[@data-test='config-section:manage-pin-assignments']",
  );

  public spioToggleCS1Pin: By = By.xpath("//*[@data-test='SPI0-CS1-span']");

  public spioToggleMISOPin: By = By.xpath("//*[@data-test='SPI0-MISO-span']");

  public spioToggleMOSIPin: By = By.xpath("//*[@data-test='SPI0-MOSI-span']");

  public spioToggleSCKPin: By = By.xpath("//*[@data-test='SPI0-SCK-span']");

  public gettextworkspace: By = By.xpath(
    "//a[@class='monaco-button monaco-text-button' and contains(text(), 'Open Workspace')]",
  );

  public getRadiobuttonSoc(socValue: string): By {
    return By.xpath(`//*[@id='MAX${socValue}']`);
  }

  public continueButton: By = By.xpath(
    "//*[@type='button' and text()='Continue']",
  );

  public continuebuttontemp: By = By.xpath(
    "//*[@data-test='wrksp-footer:continue-btn']",
  );

  public kitSelect(evkitName: string): By {
    return By.xpath(`//*[@id='${evkitName}']`);
  }

  public workspacetemplate: By = By.xpath("//*[@id='predefined']");

  public selectplugin: By = By.xpath(
    "//*[@id='com.analog.zephyr41.workspace.blinky'],",
  );

  public enterworkspacename: By = By.xpath(
    "//*[@class='_textField_zt824_50 undefined']",
  );

  public createworkspace: By = By.xpath(
    "//*[@type='button' and contains(text(), 'Create Workspace')]",
  );

  public selectpluginzephyr: By = By.xpath(
    "//*[@id='com.analog.zephyr41.workspace.blinky']",
  );

  public projectname: By = By.xpath(
    "//*[contains(@placeholder, 'Start typing...')]",
  );

  public createworkspacebutton: By = By.xpath(
    "//*[@type='button' and text()='Create Workspace']",
  );

  public quickaccess: By = By.xpath("//*[@class='quick-access-title']");

  public configname: By = By.xpath(
    "//*[@class='_socDetailsContainer_9didj_53']",
  );

  public tabconfig: By = By.xpath(
    "//a[contains(text(),'max32690-tqfn.cfsconfig')]",
  );

  randomWorkspaceName = `test_workspace_${Date.now()}`;
}
