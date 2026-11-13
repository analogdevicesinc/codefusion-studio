/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import { By, VSBrowser, WebView } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  //parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  navTab,
  sidebar,
  securitySettingsNav,
  getAppPackItemByName,
  expandImageDetails,
  imageLocationInput,
  setupMCUBootView,
  getImageLocationError,
  getImageVersionError,
  getImageSlotSizeError,
  getImageHeaderSizeError,
  getImageVersionInput,
  getImageSlotSizeInput,
  getImageHeaderSizeInput,
  securityEnabledSetting,
  securityDisabledSetting,
  signKeyManagement,
  demoSignKey,
  navigateToMCUBootConfig,
  mcubootDisabledBanner,
} from "../../page-objects/mcuboot-section/mcuboot-screen";
import { clearAndSearch } from "../../page-objects/pin-config-section/pin-config-screen";

/*
 * Feature: MCUBoot Advanced Settings Configuration
 *     As a CodeFusion Studio user
 *     I want to configure advanced MCUBoot settings including security, image properties, and validation
 *     So that I can fully customize my MCUBoot application packages
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("MCUBoot Advanced Settings Configuration", () => {
  const configFile = "mcuboot-config.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  let browser: VSBrowser;
  let view: WebView;

  before(async function () {
    this.timeout(60000);
    ({ browser } = await UIUtils.setupTestSuite({ sleepMs: 3000 }));
  });

  afterEach(async function () {
    await UIUtils.teardownTestSuite(view, configPath);
  });

  /**
   * Helper function to select an application package by name
   */
  async function selectAppPackage(packageName: string): Promise<void> {
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);
    expect(sidebarElement, "MCUBoot sidebar should exist").to.exist;

    const appPackItem = await getAppPackItemByName(packageName);
    const appPackElement = await sidebarElement.findElement(appPackItem);
    expect(appPackElement, "App pack item should exist").to.exist;
    await appPackElement.click();
    await UIUtils.sleep(1000);
  }

  /*
   * Scenario: User disables MCUBoot security and verifies disabled state
   *     Given the MCUBoot config file is opened
   *     And I dismiss all notifications and switch to webview frame
   *     When I navigate to the MCUBoot Config tab
   *     And I select the application package "New App Pack 1"
   *     And I click on the Security Settings navigation item
   *     Then the security settings panel should be displayed
   *     When I click on the "disabled" security setting
   *     Then the security setting should show "disabled"
   *     When I navigate back to MCUBoot Config tab
   *     Then a disabled banner message should be displayed
   *     And the banner should state "MCUboot configuration is disabled. System Planner will not generate any App Packs."
   */
  it("Should click on security settings and disable security", async function () {
    // Given: The MCUBoot config file is opened
    // And: I dismiss all notifications and switch to webview frame
    view = await setupMCUBootView(configPath, browser);

    // And: I select the application package "New App Pack 1"
    await selectAppPackage("New App Pack 1");

    // When: I click on the Security Settings navigation item
    const securityNav = await UIUtils.findWebElement(view, securitySettingsNav);
    await UIUtils.clickElement(view, securitySettingsNav);

    // Then: The security settings panel should be displayed
    expect(securityNav, "Security settings nav should exist").to.exist;

    const securityEnabledElement = await UIUtils.findWebElement(
      view,
      securityDisabledSetting,
    );
    expect(securityEnabledElement, "Security enabled element should exist").to
      .exist;

    // When: I click on the "disabled" security setting
    await UIUtils.clickElement(view, securityDisabledSetting);

    // Then: The security setting should show "disabled"
    const disabledRadio = await securityEnabledElement.findElement(
      By.css('vscode-radio[current-checked="true"]'),
    );
    expect(disabledRadio, "Disabled radio button should be checked").to.exist;

    // When: I navigate back to MCUBoot Config tab
    await UIUtils.clickElement(view, navigateToMCUBootConfig);
    expect(await UIUtils.findWebElement(view, navTab)).to.exist;

    // Then: A disabled banner message should be displayed
    const DisableBanner = await UIUtils.findWebElement(
      view,
      mcubootDisabledBanner,
    );
    expect(DisableBanner, "Disable banner element should exist").to.exist;
  });

  /*
   * Scenario: User navigates to Security Settings and verifies security is enabled
   *     Given the MCUBoot config file is opened
   *     And I dismiss all notifications and switch to webview frame
   *     When I navigate to the MCUBoot Config tab
   *     And I select the application package "New App Pack 1"
   *     And I click on the Security Settings navigation item
   *     Then the security settings panel should be displayed
   *     And the security enabled setting should show "enabled"
   *     And the enabled radio button should be checked
   *     And the Sign Key Management section should be visible
   *     And the demo sign key "demo-key.pem" should be displayed
   *     When I click "navigate to MCUBoot config" button
   *     Then I should return to the MCUBoot Config tab
   */
  it("Should click on security settings and navigate to it for sign key and security enablement", async function () {
    // Given: The MCUBoot config file is opened
    // And: I dismiss all notifications and switch to webview frame
    view = await setupMCUBootView(configPath, browser);

    // And: I select the application package "New App Pack 1"
    await selectAppPackage("New App Pack 1");

    // When: I click on the Security Settings navigation item
    const securityNav = await UIUtils.findWebElement(view, securitySettingsNav);
    await UIUtils.clickElement(view, securitySettingsNav);

    // Then: The security settings panel should be displayed
    expect(securityNav, "Security settings nav should exist").to.exist;

    // And: The security enabled setting should show "enabled"
    const securityEnabledElement = await UIUtils.findWebElement(
      view,
      securityEnabledSetting,
    );
    expect(securityEnabledElement, "Security enabled element should exist").to
      .exist;
    // And: The enabled radio button should be checked
    const enabledRadio = await securityEnabledElement.findElement(
      By.css('vscode-radio[current-checked="true"]'),
    );

    const checkedTrue = await UIUtils.getAttributeFromWebElement(
      enabledRadio,
      "current-checked",
    );
    expect(checkedTrue, "Enabled radio button should be checked").to.equal(
      "true",
    );
    expect(enabledRadio, "Enabled radio button should be checked").to.exist;

    // And: The Sign Key Management section should be visible
    const SignKeyManagement = await UIUtils.findWebElement(
      view,
      signKeyManagement,
    );
    expect(SignKeyManagement, "Sign key management element should exist").to
      .exist;

    // And: The demo sign key "demo-key.pem" should be displayed
    const demoSignKeyElement = await UIUtils.findWebElement(view, demoSignKey);
    expect(demoSignKeyElement, "Demo sign key element should exist").to.exist;

    // When: I click "navigate to MCUBoot config" button
    await UIUtils.clickElement(view, navigateToMCUBootConfig);

    // Then: I should return to the MCUBoot Config tab
    expect(await UIUtils.findWebElement(view, navTab)).to.exist;
  });

  /*
   * Scenario: User triggers multiple validation errors simultaneously
   *     Given the MCUBoot config file is opened
   *     And I dismiss all notifications and switch to webview frame
   *     When I navigate to the MCUBoot Config tab
   *     And I select the application package "New App Pack 1"
   *     And I expand the image details section for "Image 1"
   *     When I enter an invalid location "$$"
   *     Then a location validation error should be displayed
   *     When I enter an invalid version "abc"
   *     Then a version validation error should be displayed
   *     When I enter an invalid slot size "766"
   *     Then a slot size validation error should be displayed
   *     When I enter an invalid header size "123"
   *     Then a header size validation error should be displayed
   *     And all four validation errors should be visible simultaneously
   */
  it("Should display multiple validation errors simultaneously", async function () {
    this.timeout(120000);

    // Given: The MCUBoot config file is opened
    view = await setupMCUBootView(configPath, browser);

    // And: I select the application package "New App Pack 1"
    await selectAppPackage("New App Pack 1");

    // And: I expand the image details section for "Image 1"
    await expandImageDetails(view);

    // When: I enter an invalid location "$$"
    const locationInput = await UIUtils.findWebElement(
      view,
      imageLocationInput,
    );
    await clearAndSearch(locationInput, "$$");

    // Then: A location validation error should be displayed
    const errorLocation = await UIUtils.findWebElement(
      view,
      await getImageLocationError("Image 1"),
    );
    expect(
      await errorLocation.isDisplayed(),
      "Location error should be visible",
    ).to.be.true;

    // When: I enter an invalid version "abc"
    const versionInput = await UIUtils.findWebElement(
      view,
      await getImageVersionInput("Image 1"),
    );
    await versionInput.click();
    await clearAndSearch(versionInput, "abc");

    // Then: A version validation error should be displayed
    const errorVersion = await UIUtils.findWebElement(
      view,
      await getImageVersionError("Image 1"),
    );
    expect(await errorVersion.isDisplayed(), "Version error should be visible")
      .to.be.true;

    // When: I enter an invalid slot size "766"
    const slotSizeInput = await UIUtils.findWebElement(
      view,
      await getImageSlotSizeInput("Image 1"),
    );
    await clearAndSearch(slotSizeInput, "766");

    // Then: A slot size validation error should be displayed
    const slotError = await UIUtils.findWebElement(
      view,
      await getImageSlotSizeError("Image 1"),
    );
    expect(await slotError.isDisplayed(), "Slot size error should be visible")
      .to.be.true;

    // When: I enter an invalid header size "123"
    const headerSizeInput = await UIUtils.findWebElement(
      view,
      await getImageHeaderSizeInput("Image 1"),
    );
    await clearAndSearch(headerSizeInput, "123");

    // Then: A header size validation error should be displayed
    // And: All four validation errors should be visible simultaneously
    const headerError = await UIUtils.findWebElement(
      view,
      await getImageHeaderSizeError("Image 1"),
    );
    expect(
      await headerError.isDisplayed(),
      "Header size error should be visible",
    ).to.be.true;
  });
});
