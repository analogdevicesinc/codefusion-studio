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

import { By, WebView, VSBrowser, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

// Navigation tabs
export const navTab: By = By.css('[data-test="nav-item:mcubootConfig"]');

// Container
export const container: By = By.css('[data-test="mcuboot-config:container"]');

// Sidebar
export const sidebar: By = By.css('[data-test="mcuboot-config:sidebar"]');
export const addAppPackButton: By = By.css(
  '[data-test="mcuboot-config:sidebar:add-app-pack"]',
);
export const appPackItems: By = By.css('[data-test^="sidebar:app-pack-item:"]');

// Application Package Summary Section
export const applicationPackageSummary: By = By.css(
  '[data-test="mcuboot-config:application-package-summary"]',
);
export const packageCoreDropdown: By = By.css('[data-test="package-core"]');
export const addImageButton: By = By.css(
  '[data-test="app-packages-summary:add-app-pack-button"]',
);
export const removeAppPackButton: By = By.css(
  '[data-test="app-packages-summary:remove-app-pack-button"]',
);
export const deleteAppPackConfirmButton: By = By.css(
  '[data-test="delete-app-pack-warning:confirm-btn"]',
);
export const editNameTrigger: By = By.css(
  '[data-test="app-packages-summary:edit-name-trigger"]',
);
export const packageNameInput: By = By.css(
  '[data-test="edit-package-name-control-input"]',
);
export const confirmButton: By = By.css('[data-test="edit-input-confirm-btn"]');
export const enabledToggle: By = By.css(
  '[data-test="app-packages-summary:enabled-toggle-span"]',
);

// Image Details Section
export const imageDetailsChevron: By = By.css('[data-test$="details-chevron"]');
export const imageBootableCheckbox: By = By.css('[data-test="image-bootable"]');

// Sign Key Section
// Using XPath [2] to target image-level dropdown (not package-level)
export const signKeyDropdown: By = By.xpath(
  '(//*[@data-test="assign-sign-key:dropdown"])[2]',
);
export const signKeyInheritOption: By = By.xpath(
  '(//*[@data-test="assign-sign-key:inherit"])[1]',
);

// Encryption Keys Section
export const aesKwKeyInput: By = By.css(
  '[data-test="image-aes-kw-key-path-control-input"]',
);
export const aesGcmKeyInput: By = By.css(
  '[data-test="image-aes-gcm-key-path-control-input"]',
);

// Custom TLV Section
export const customTlvCardHeader: By = By.xpath(
  '(//*[contains(@data-test, "custom-tlv-card:")])[1]',
);
export const customTlvNameField: By = By.xpath(
  '(//*[contains(@data-test, "custom-tlv-card:")])[1]//*[contains(@data-test, "-name")]',
);
export const tlvNameInput: By = By.css(
  '[data-test="edit-tlv-name-control-input"]',
);
export const tlvValueInput: By = By.css(
  '[data-test="custom-tlv-value-control-input"]',
);
export const tlvValueError: By = By.css('[data-test="custom-tlv-value-error"]');

// Security Settings Section
export const securitySettingsNav: By = By.xpath(
  "//button[@type='button' and contains(text(), 'Security Settings')]",
);
export const securitySettingsPanel: By = By.css(
  '[data-test="security-settings-panel"]',
);
export const securityEnabledSetting: By = By.css(
  '[data-test="workspace-setting:mcuboot-enable-enabled"]',
);
export const securityDisabledSetting: By = By.css(
  '[data-test="workspace-setting:mcuboot-enable-disabled"]',
);
export const signKeyManagement: By = By.css(
  '[data-test="workspace-setting:sign-key-management"]',
);
export const demoSignKey: By = By.css(
  '[data-test="key-management:key-card-demo-key.pem"]',
);
export const navigateToMCUBootConfig: By = By.css(
  '[data-test="navigate-to-mcuboot-config"]',
);
export const mcubootDisabledBanner: By = By.xpath(
  "//span[normalize-space(text())='MCUboot configuration is disabled. System Planner will not generate any App Packs.']",
);

// Image Configuration Fields
export const imageNameInput: By = By.css(
  '[data-test="image-name-control-input"]',
);
export const imageDescriptionInput: By = By.css(
  '[data-test="image-description-control-input"]',
);
export const imageLocationInput: By = By.css('input[placeholder="00000000"]');
export const imageVersionInput: By = By.css(
  '[data-test="image-version-control-input"]',
);
export const imageSlotSizeInput: By = By.css(
  '[data-test="image-slot-size-control-input"]',
);

// Bootable Flag and Badge
export const bootableBadge: By = By.css('[data-test="image-bootable-badge"]');
export const bootableToggle: By = By.css('[data-test="image-bootable-toggle"]');

// Validation Errors
export const imageNameError: By = By.css('[data-test="image-name-error"]');
export const imageLocationError: By = By.css(
  '[data-test="image-location-error"]',
);
export const imageVersionError: By = By.css(
  '[data-test="image-version-error"]',
);
export const imageSlotSizeError: By = By.css(
  '[data-test="image-slot-size-error"]',
);
export const overlappingAddressError: By = By.css(
  '[data-test="overlapping-address-error"]',
);

// Save State Indicators
export const saveIndicator: By = By.css('[data-test="save-indicator"]');
export const unsavedChangesIndicator: By = By.css(
  '[data-test="unsaved-changes-indicator"]',
);

// Sign Key Options
export const signKeyCustomOption: By = By.css(
  '[data-test="assign-sign-key:custom"]',
);
export const signKeyFilePathInput: By = By.css(
  '[data-test="sign-key-path-control-input"]',
);

/**
 * Get selector for app pack item by name
 * @param packageName - The name of the application package
 */
export async function getAppPackItemByName(packageName: string): Promise<By> {
  return By.xpath(`.//*[contains(text(), "${packageName}")]`);
}

/**
 * Get selector for core option by name
 * @param coreName - The display name of the core (e.g., "Secondary Core 1")
 */
export async function getCoreOptionByName(coreName: string): Promise<By> {
  return By.xpath(
    `//*[@data-test="package-core"]//vscode-option[contains(text(), "${coreName}")]`,
  );
}

/**
 * Get selector for image slot size input by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageSlotSizeInput(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-slot-size-control-input"]`);
}

/**
 * Get selector for image header size input by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageHeaderSizeInput(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-header-size-control-input"]`);
}

/**
 * Get selector for image location input by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageLocationInput(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-location-control-input"]`);
}

/**
 * Get selector for image version input by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageVersionInput(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-image-version-control-input"]`);
}

/**
 * Get selector for image location error by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageLocationError(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-location-address-error"]`);
}

/**
 * Get selector for image version error by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageVersionError(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-image-version-error"]`);
}

/**
 * Get selector for image slot size error by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageSlotSizeError(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-slot-size-error"]`);
}

/**
 * Get selector for image header size error by image name
 * @param imageName - The name of the image (e.g., "Image 1")
 */
export async function getImageHeaderSizeError(imageName: string): Promise<By> {
  return By.css(`[data-test="image:${imageName}-header-size-error"]`);
}
/**
 * Get selector for image title by image name
 * @param imageName - The name of the image (e.g., "Image 1", "Image 2")
 */
export async function getImageTitleByName(imageName: string): Promise<By> {
  return By.xpath(
    `//div[contains(@data-test, 'image-card:') and contains(@data-test, '-name')]/span[text()='${imageName}']`,
  );
}

/**
 * Helper function to expand image details section
 * @param view - The WebView instance
 */
export async function expandImageDetails(view: WebView): Promise<void> {
  expect(
    await UIUtils.findWebElement(view, imageDetailsChevron),
    "Image chevron should exist",
  ).to.exist;
  await UIUtils.clickElement(view, imageDetailsChevron);
  await UIUtils.sleep(1000);
}

/**
 * Helper function to set up the MCUBoot config view
 * @param configPath - Path to the config file to open
 * @param browser - VSBrowser instance
 * @returns WebView instance ready for testing
 */
export async function setupMCUBootView(
  configPath: string,
  browser: VSBrowser,
): Promise<WebView> {
  await browser.openResources(configPath);
  const workbench = new Workbench();
  const view = new WebView();
  await view.wait(8000);
  await UIUtils.dismissAllNotifications(workbench, browser);
  await view.switchToFrame(5000);

  // Navigate to the MCUBoot Config tab
  await UIUtils.clickElement(view, navTab);
  await UIUtils.sleep(2000);

  return view;
}
