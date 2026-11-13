/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

// Sidebar Navigation Locators
export const openHomePageMenuItem: By = By.xpath(
  "//span[contains(text(),'Open Home Page')]",
);

// Home Page Locators
export const homePageTitle: By = By.xpath(
  "//div[contains(text(),'Quick Access')]",
);

export const newWorkspaceLink: By = By.xpath(
  "//vscode-link[contains(@class, 'quick-access-text')]//span[contains(text(),'New Workspace')]",
);

export const openWorkspaceLink: By = By.xpath(
  "//vscode-link[contains(@class, 'quick-access-text')]//span[contains(text(),'Open Workspace')]",
);

export const browseExamplesLink: By = By.xpath(
  "//vscode-link[contains(@class, 'quick-access-text')]//span[contains(text(),'Browse MSDK Examples')]",
);

export const openConfigFileLink: By = By.xpath(
  "//vscode-link[contains(@class, 'quick-access-text')]//span[contains(text(),'Open Config File')]",
);

export const openElfFileLink: By = By.xpath(
  "//vscode-link[contains(@class, 'quick-access-text')]//span[contains(text(),'Open ELF File')]",
);

export const showAtStartupCheckbox: By = By.xpath(
  "//div[contains(@class,'checkbox-layer')][.//*[contains(text(),'Show at startup')]]//vscode-checkbox",
);

export const walkthroughTitle: By = By.xpath(
  "//div[contains(@class,'walkthrough-title') and contains(text(),'Walkthrough')]",
);

// Helpful Resources carousel locators
export const helpfulResourcesTitle: By = By.xpath(
  "//h2[contains(text(),'Helpful Resources')]",
);

export const carouselPrevButton: By = By.css(".swiper-button-prev");

export const carouselNextButton: By = By.css(".swiper-button-next");

export const carouselPaginationBullets: By = By.css(
  ".pagination .swiper-pagination-bullet",
);

export const carouselResourceCards: By = By.css(".swiper-slide");
