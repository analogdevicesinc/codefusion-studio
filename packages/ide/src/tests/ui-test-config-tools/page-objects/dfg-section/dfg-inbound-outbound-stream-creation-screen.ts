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

/* This file contains page object locators and functions for DFG inbound/outbound stream creation. */
import {
  By,
  ModalDialog,
  VSBrowser,
  WebElement,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { parseJSONFile } from "../../config-tools-utility/cfsconfig-utils";
import {
  assertPersistedStreamForSource,
  DestinationConfig,
  PersistedDFGStream,
  SourceConfig,
} from "./dfg-persistence-assertions";
import { statSync } from "fs";
import { existsSync, readFileSync, unlinkSync } from "fs";

export const homePageTitle = By.css("div[class*='_socDetailsContainer'] h1");

export const dfgTab = By.css('[data-test="nav-item:dfg"]');

export const subscreenBtnContainer: By = By.css(
  `[data-test="subscreen-buttons-container"]`,
);

export const subscreenBtnDfgVisualisation = By.css(
  '[data-test="subscreen-button:dfgVisualisation"]',
);

export const subscreenBtnDfgStreamList = By.css(
  '[data-test="subscreen-buttons-container"] [data-test="subscreen-button:dfgStreamList"]',
);

export function selectStream(streamName: string): By {
  return By.css(`[data-test="accordion:${streamName}"]`);
}

export function addInboundStreamButton(streamName: string): By {
  return By.css(
    `[data-test="inbound-stream-header-${streamName}"] vscode-button`,
  );
}

export function addOutboundStreamButton(streamName: string): By {
  return By.css(
    `[data-test="outbound-stream-header-${streamName}"] vscode-button`,
  );
}

export function inboundStreamCount(streamName: string): By {
  return By.css(`[data-test="inbound-streams-${streamName}"]`);
}

export function outboundStreamCount(streamName: string): By {
  return By.css(`[data-test="outbound-streams-${streamName}"]`);
}

export const sidePanelCloseButton = By.xpath(
  '(//div[contains(@class,"opening")]//vscode-button)[5]',
);

export const sidePanelState = By.xpath(
  '(//div[@data-test="dfg-visualisation"]//div[contains(@class,"sidePanelContainer")]/div)[1]',
);

export const streamSourceDropdown = By.css('[data-test="stream-source"]');

export function streamSourceOption(streamName: string): By {
  return By.id(`stream-source_${streamName}`);
}

export const streamDestinationDropdown = By.css(
  '[data-test="stream-destination"] button',
);

export const streamDestinationText = By.css(
  '[data-test="stream-destination"] p',
);

export function streamDestinationOption(streamName: string): By {
  return By.css(
    `vscode-checkbox:has(>[data-test="multiselect-option-${streamName}"])`,
  );
}

export const streamDescription = By.css(
  '[data-test="stream-alias-control-input"]',
);

export const sourceBufferSizeDropdown = By.css(
  '[data-test="Source-buffer-size-selector"]',
);

export function sourceBufferSizeOption(size: number): By {
  return By.id(`Source_${size}`);
}

export function destinationBufferSizeDropdown(streamName: string): By {
  return By.css(
    `[data-test="${streamName}-Destinations-buffer-size-selector"]`,
  );
}

export function destinationBufferSizeOption(
  streamName: string,
  size: number,
): By {
  return By.css(
    `[data-test="${streamName}-Destinations-buffer-size-selector"] vscode-option[id="Destinations_${size}"]`,
  );
}

export const createStreamButton = By.id("sidepanel-create-stream");

export async function getOutboundStreamCount(
  view: WebView,
  streamName: string,
): Promise<number> {
  const outboundStreamCountElement = await UIUtils.findWebElement(
    view,
    outboundStreamCount(streamName),
  );
  const outboundStreamCountText = await outboundStreamCountElement.getText();
  return parseInt(outboundStreamCountText);
}

export async function getInboundStreamCount(
  view: WebView,
  streamName: string,
): Promise<number> {
  const inboundStreamCountElement = await UIUtils.findWebElement(
    view,
    inboundStreamCount(streamName),
  );
  const inboundStreamCountText = await inboundStreamCountElement.getText();
  return parseInt(inboundStreamCountText);
}

export const streamListGridRow = By.css("vscode-data-grid-row");

export async function getStreamRowCount(view: WebView): Promise<number> {
  const gridRow: WebElement[] = await view.findWebElements(streamListGridRow);
  return gridRow.length;
}

export const mainCreateStreamButton = By.id("create-stream-button");

export const quickInputWidget: By = By.css(".quick-input-widget");

export const exportAsCsvButton = By.css('[data-test="export-as-csv"]');

export async function switchToStreamListTab(view: WebView): Promise<void> {
  await UIUtils.clickElement(view, subscreenBtnDfgStreamList);
}

export async function switchToDfgVisualisationTab(
  view: WebView,
): Promise<void> {
  await UIUtils.clickElement(view, subscreenBtnDfgVisualisation);
}

export function streamCellValue(row: number, column: number): By {
  return By.css(
    `vscode-data-grid-row:nth-child(${row}) vscode-data-grid-cell[grid-column="${column}"]`,
  );
}

export const sourceBufferSizeError = By.css(
  '[data-test="Source-buffer-size-selector-error"]',
);

export function destinationBufferSizeError(streamName: string): By {
  return By.css(
    `[data-test="${streamName}-Destinations-buffer-size-selector-error"]`,
  );
}

export const deleteStreamButton = By.css('[data-test="delete-stream-button"]');

export const confirmDeleteStreamButton = By.css(
  '[data-test="confirm-delete-stream"]',
);

export function createdStreamConfigButton(title: string): By {
  return By.css(`div:has(>[title="${title}"]) vscode-button`);
}

export async function getDropdownCurrentValue(
  view: WebView,
  dropdown: By,
): Promise<number> {
  const dropdownElement = await UIUtils.findWebElement(view, dropdown);
  const currentValue = await dropdownElement.getAttribute("current-value");
  return parseInt(currentValue ?? "", 10);
}

export const tiedSourceStreamDropdown = By.css(
  '[data-test="tied-stream-dropdown"]',
);

export const tiedSourceStreamDropdownOption = By.css(
  '[data-test="tied-stream-dropdown-content"] div[data-test*="tied-stream-option"]:nth-child(1)',
);

export const modelDialogHeader = By.css('div[class*="modalBody"]>h2');

export const modalDialogCancelButton = By.css(
  'div[class*="modalFooter"] vscode-button',
);

export const gridRow = By.css("vscode-data-grid-row");

export function gridCell(row: number): By {
  return By.css(`vscode-data-grid-row:nth-child(${row}) vscode-data-grid-cell`);
}

export const destinationError = By.css(
  '[data-test="stream-destination-error"]',
);

export const sourceStreamError = By.css('[data-test="source-stream-error"]');

export const generateCodeTab = By.css('[data-test="nav-item:generate"]');

export const generateCodeButton = By.css(
  '[data-test="generate-code:generate-btn"]',
);

export function sourceStreamPriority(stream: string): By {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-PRIORITY-control-input"]`,
  );
}

export function sourceStreamPriorityDownArrow(stream: string): By {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-PRIORITY-control-input"] vscode-button[class*='downArrow']`,
  );
}

export function destinationStreamPriority(stream: string): By {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-PRIORITY-control-input"]`,
  );
}

export function destinationStreamPriorityDownArrow(stream: string): By {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-PRIORITY-control-input"] vscode-button[class*='downArrow']`,
  );
}

export function sourceStreamPriorityError(stream: string): By {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-PRIORITY-error"]`,
  );
}

export function destinationStreamPriorityError(stream: string): By {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-PRIORITY-error"]`,
  );
}

export async function sourceWindowInterruptToggle(stream: string): Promise<By> {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:INT_WINDOW_EN-span"]`,
  );
}

export async function sourceWindowSizeInput(stream: string): Promise<By> {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-INT_WINDOW_SIZE-control-input"]`,
  );
}

export async function sourceInterruptLineDropdown(stream: string): Promise<By> {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-INT_LINE_SRC"]`,
  );
}

export async function sourceInterruptLineDropdownOption(
  stream: string,
  line: number,
): Promise<By> {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-INT_LINE_SRC:${line}"]`,
  );
}

export function sourceAliasInput(stream: string): By {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-ALIAS-control-input"]`,
  );
}

export function sourceInterruptPriority(stream: string): By {
  return By.css(
    `[data-test="Source-${stream}-additionalControls:control-INT_PRIORITY-control-input"]`,
  );
}

export async function destinationBufferInterruptToggle(
  stream: string,
): Promise<By> {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:INT_BUFFER_EN-span"]`,
  );
}

export async function destinationBufferSizeInput(stream: string): Promise<By> {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-INT_BUFFER_SIZE-control-input"]`,
  );
}

export async function destinationWindowInterruptToggle(
  stream: string,
): Promise<By> {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:INT_WINDOW_EN-span"]`,
  );
}

export async function destinationWindowSizeInput(stream: string): Promise<By> {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-INT_WINDOW_SIZE-control-input"]`,
  );
}

export async function destinationInterruptLineDropdown(
  stream: string,
): Promise<By> {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-INT_LINE_DEST"]`,
  );
}

export async function destinationInterruptLineDropdownOption(
  stream: string,
  line: number,
): Promise<By> {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-INT_LINE_DEST:${line}"]`,
  );
}

export function destinationAliasInput(stream: string): By {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-ALIAS-control-input"]`,
  );
}

export function destinationInterruptPriority(stream: string): By {
  return By.css(
    `[data-test="Destinations-${stream}-additionalControls:control-INT_PRIORITY-control-input"]`,
  );
}

export async function createStreamWithValues(
  view: WebView,
  source: string,
  destination: string,
  sourceBufferSize: number,
  destinationBufferSize: number,
): Promise<void> {
  const streamDescriptionInput = await UIUtils.findWebElement(
    view,
    streamDescription,
  );
  await UIUtils.clickElement(view, streamDescriptionInput);
  await streamDescriptionInput.sendKeys(source + "-" + destination);

  const sourceBufferSizeDropdownElement = await UIUtils.findWebElement(
    view,
    sourceBufferSizeDropdown,
  );
  if (
    (await sourceBufferSizeDropdownElement.getAttribute("aria-disabled")) ===
    "true"
  ) {
    console.log("Source buffer size dropdown is disabled, skipping selection");
  } else {
    await UIUtils.selectOptionFromDropdown(
      view,
      sourceBufferSizeDropdown,
      sourceBufferSizeOption(sourceBufferSize),
    );
  }
  const destinationBufferSizeDropdownElement = await UIUtils.findWebElement(
    view,
    destinationBufferSizeDropdown(destination),
  );
  if (
    (await destinationBufferSizeDropdownElement.getAttribute(
      "aria-disabled",
    )) === "true"
  ) {
    console.log(
      "Destination buffer size dropdown is disabled, skipping selection",
    );
  } else {
    await UIUtils.selectOptionFromDropdown(
      view,
      destinationBufferSizeDropdown(destination),
      destinationBufferSizeOption(destination, destinationBufferSize),
    );
  }

  await UIUtils.clickElement(view, createStreamButton);
}

export async function validateStreamListValues(
  view: WebView,
  expectedStreamRowCount: number,
): Promise<Array<string | number>> {
  const sourceColumnNo = 2;
  const destinationColumnNo = 3;
  const bufferSizeColumnNo = 8;
  const sourceCellValue = await UIUtils.findWebElement(
    view,
    streamCellValue(expectedStreamRowCount, sourceColumnNo),
  );
  const destinationCellValue = await UIUtils.findWebElement(
    view,
    streamCellValue(expectedStreamRowCount, destinationColumnNo),
  );
  const bufferSizeValueElement = await UIUtils.findWebElement(
    view,
    streamCellValue(expectedStreamRowCount, bufferSizeColumnNo),
  );

  const sourceStreamValue = await sourceCellValue.getText();
  const destinationStreamValue = await destinationCellValue.getText();
  const bufferSizeValueStr = await bufferSizeValueElement.getText();
  const bufferSizeValue = bufferSizeValueStr.replace(/B/g, "");
  const bufferSizeValueNum = bufferSizeValue.split(" ");

  return [
    sourceStreamValue,
    destinationStreamValue,
    parseInt(bufferSizeValueNum[0]),
    parseInt(bufferSizeValueNum[2]),
  ];
}

export async function isExportAsCsvButtonEnabled(
  view: WebView,
): Promise<[number, boolean]> {
  const streamListRowCount = await getStreamRowCount(view);
  const exportAsCsvButtonElement = await UIUtils.findWebElement(
    view,
    exportAsCsvButton,
  );
  const exportBtnClass = await exportAsCsvButtonElement.getAttribute("class");
  const isExportButtonEnabled = !(exportBtnClass ?? "").includes("disabled");
  return [streamListRowCount, isExportButtonEnabled];
}

export async function verifyConfigFilePersistence(
  view: WebView,
  workbench: Workbench,
  configPath: string,
  isDeleteCheck: boolean,
  source: string,
  destination: string[],
  sourceBufferSize: number,
  destinationBufferSize: number[],
  groupName?: string,
  sourceConfig?: SourceConfig,
  destinationConfigs?: DestinationConfig[],
): Promise<void> {
  await view.switchBack();
  await workbench.executeCommand("view: close all editors");
  const dialog = new ModalDialog();
  await dialog.pushButton("Save");

  console.log("Saved the configuration file");
  await UIUtils.sleep(300);

  // === AND: I verify the persistence schema of the config file after changes being saved ===
  const config = (await parseJSONFile(configPath)) as {
    DFG?: {
      Streams?: PersistedDFGStream[];
    };
  };
  const streamDescription = getStreamDescription(source, destination);
  assertPersistedStreamForSource(
    config.DFG?.Streams,
    isDeleteCheck,
    source,
    destination,
    streamDescription,
    sourceBufferSize,
    destinationBufferSize,
    groupName,
    sourceConfig,
    destinationConfigs,
  );

  console.log(
    "✅ Complete DFG stream with persistence validation scenario executed successfully",
  );
}

export function getStreamDescription(
  source: string,
  destination: string[],
): string {
  let streamDescriptionValue: string = "";
  destination.forEach((dest) => {
    streamDescriptionValue += `${source}-${dest}, `;
  });
  streamDescriptionValue = streamDescriptionValue.slice(0, -2);
  return streamDescriptionValue;
}

export async function selectStreamToDelete(
  view: WebView,
  source: string,
  destination: string[],
): Promise<WebElement | undefined> {
  const gridRows = await view.findWebElements(gridRow);
  for (let i = 0; i < gridRows.length; i++) {
    let sourceCell = await UIUtils.findWebElement(
      view,
      streamCellValue(i + 1, 2),
    );
    let destinationCell = await UIUtils.findWebElement(
      view,
      streamCellValue(i + 1, 3),
    );
    let descriptionCell = await UIUtils.findWebElement(
      view,
      streamCellValue(i + 1, 5),
    );
    let configurationCell = await UIUtils.findWebElement(
      view,
      streamCellValue(i + 1, 9),
    );
    const expectedDescription = getStreamDescription(source, destination);
    if (
      (await sourceCell.getText()) === source &&
      (await destinationCell.getText()) === destination[0] &&
      (await descriptionCell.getText()) === expectedDescription
    ) {
      return configurationCell;
    } else {
      console.log("Going for next iteration");
      continue;
    }
  }

  return undefined;
}

export async function validateExportedCsvContent(
  filename: string,
  expectedStreamValues: string[],
): Promise<[number, string[], boolean]> {
  try {
    const csvContent = readFileSync(filename, "utf-8");
    const csvLines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const fileSize = statSync(filename).size;

    // Verify at least one data row contains expected source, destination and buffer sizes
    const hasExpectedStreamRow = csvLines.slice(1).some((line) => {
      const columns = line
        .split(",")
        .map((col) => col.trim().replace(/^"|"$/g, ""));
      return expectedStreamValues.every((v) => columns.includes(v));
    });
    return [fileSize, csvLines, hasExpectedStreamRow];
  } catch (error) {
    console.error("Error while reading CSV file:", error);
    return [0, [], false];
  } finally {
    if (existsSync(filename)) unlinkSync(filename);
  }
}

export async function getSourceConfigDetails(
  view: WebView,
  source: string,
): Promise<SourceConfig> {
  let sourceStreamAliasValue: string | undefined;
  let sourceStreamWindowInterruptValue: string | undefined;
  let sourceStreamWindowSizeValue: string | undefined;
  let sourceInterruptPriorityValue: string | undefined;
  let sourceInterruptLineValue: string | undefined;

  // Stream Priority
  const sourceStreamPriorityElement = await UIUtils.findWebElement(
    view,
    sourceStreamPriority(source),
  );
  const sourceStreamPriorityValue =
    await sourceStreamPriorityElement.getAttribute("current-value");

  // Source Alias
  const sourceAliasElements = await view.findWebElements(
    sourceAliasInput(source),
  );
  if (
    sourceAliasElements.length > 0 &&
    (await sourceAliasElements[0].isDisplayed())
  ) {
    sourceStreamAliasValue =
      await sourceAliasElements[0].getAttribute("current-value");
  }

  // Source Window Interrupt
  const sourceWindowInterruptElements = await view.findWebElements(
    await sourceWindowInterruptToggle(source),
  );
  if (
    sourceWindowInterruptElements.length > 0 &&
    (await sourceWindowInterruptElements[0].isDisplayed())
  ) {
    sourceStreamWindowInterruptValue =
      await sourceWindowInterruptElements[0].getAttribute("data-checked");
  }

  // Source Window Size
  if (sourceStreamWindowInterruptValue === "true") {
    const sourceWindowSizeInputElements = await view.findWebElements(
      await sourceWindowSizeInput(source),
    );
    if (
      sourceWindowSizeInputElements.length > 0 &&
      (await sourceWindowSizeInputElements[0].isDisplayed())
    ) {
      sourceStreamWindowSizeValue =
        await sourceWindowSizeInputElements[0].getAttribute("current-value");
    }

    // Source Interrupt Priority
    const sourceInterruptPriorityElement = await view.findWebElements(
      sourceInterruptPriority(source),
    );
    if (
      sourceInterruptPriorityElement.length > 0 &&
      (await sourceInterruptPriorityElement[0].isDisplayed())
    ) {
      sourceInterruptPriorityValue =
        await sourceInterruptPriorityElement[0].getAttribute("current-value");
    }

    // Source Interrupt Line
    const sourceInterruptLineDropdownElement = await view.findWebElements(
      await sourceInterruptLineDropdown(source),
    );
    if (
      sourceInterruptLineDropdownElement.length > 0 &&
      (await sourceInterruptLineDropdownElement[0].isDisplayed())
    ) {
      sourceInterruptLineValue =
        await sourceInterruptLineDropdownElement[0].getAttribute(
          "current-value",
        );
    }
  }

  const sourceConfig: SourceConfig = {
    PRIORITY: sourceStreamPriorityValue,
    ...(sourceStreamAliasValue !== undefined && {
      ALIAS: sourceStreamAliasValue,
    }),
    ...(sourceStreamWindowInterruptValue !== undefined && {
      INT_WINDOW_EN:
        sourceStreamWindowInterruptValue === "true" ? "TRUE" : "FALSE",
    }),
    ...(sourceInterruptPriorityValue !== undefined && {
      INT_PRIORITY: sourceInterruptPriorityValue,
    }),
    ...(sourceInterruptLineValue !== undefined && {
      INT_LINE_SRC: sourceInterruptLineValue,
    }),
    ...(sourceStreamWindowSizeValue !== undefined && {
      INT_WINDOW_SIZE: sourceStreamWindowSizeValue,
    }),
  };
  return sourceConfig;
}

export async function getDestinationConfigDetails(
  view: WebView,
  browser: VSBrowser,
  destination: string,
): Promise<DestinationConfig> {
  let destinationStreamAliasValue: string | undefined;
  let destinationStreamBufferInterruptValue: string | undefined;
  let destinationStreamBufferSizeValue: string | undefined;
  let destinationStreamWindowInterruptValue: string | undefined;
  let destinationStreamWindowSizeValue: string | undefined;
  let destinationInterruptPriorityValue: string | undefined;
  let destinationInterruptLineValue: string | undefined;

  // Destination Stream Priority
  const destinationStreamPriorityElement = await UIUtils.findWebElement(
    view,
    destinationStreamPriority(destination),
  );
  await browser.driver.executeScript(
    "arguments[0].scrollIntoView()",
    destinationStreamPriorityElement,
  );
  const destinationStreamPriorityValue =
    await destinationStreamPriorityElement.getAttribute("current-value");

  // Destination Alias
  const destinationAliasElements = await view.findWebElements(
    destinationAliasInput(destination),
  );
  if (
    destinationAliasElements.length > 0 &&
    (await destinationAliasElements[0].isDisplayed())
  ) {
    destinationStreamAliasValue =
      await destinationAliasElements[0].getAttribute("current-value");
  }

  // Destination Buffer Interrupt
  const destinationBufferInterruptElements = await view.findWebElements(
    await destinationBufferInterruptToggle(destination),
  );
  if (
    destinationBufferInterruptElements.length > 0 &&
    (await destinationBufferInterruptElements[0].isDisplayed())
  ) {
    destinationStreamBufferInterruptValue =
      await destinationBufferInterruptElements[0].getAttribute("data-checked");
  }

  // Destination Buffer Size
  if (destinationStreamBufferInterruptValue === "true") {
    const destinationBufferSizeInputElements = await view.findWebElements(
      await destinationBufferSizeInput(destination),
    );
    if (
      destinationBufferSizeInputElements.length > 0 &&
      (await destinationBufferSizeInputElements[0].isDisplayed())
    ) {
      destinationStreamBufferSizeValue =
        await destinationBufferSizeInputElements[0].getAttribute(
          "current-value",
        );
    }
  }

  // Destination Window Interrupt
  const destinationWindowInterruptElements = await view.findWebElements(
    await destinationWindowInterruptToggle(destination),
  );
  if (
    destinationWindowInterruptElements.length > 0 &&
    (await destinationWindowInterruptElements[0].isDisplayed())
  ) {
    destinationStreamWindowInterruptValue =
      await destinationWindowInterruptElements[0].getAttribute("data-checked");
  }

  // Destination Window Size
  if (destinationStreamWindowInterruptValue === "true") {
    const destinationWindowSizeInputElements = await view.findWebElements(
      await destinationWindowSizeInput(destination),
    );
    if (
      destinationWindowSizeInputElements.length > 0 &&
      (await destinationWindowSizeInputElements[0].isDisplayed())
    ) {
      destinationStreamWindowSizeValue =
        await destinationWindowSizeInputElements[0].getAttribute(
          "current-value",
        );
    }

    // Destination Interrupt Priority
    const destinationInterruptPriorityElement = await view.findWebElements(
      destinationInterruptPriority(destination),
    );
    if (
      destinationInterruptPriorityElement.length > 0 &&
      (await destinationInterruptPriorityElement[0].isDisplayed())
    ) {
      destinationInterruptPriorityValue =
        await destinationInterruptPriorityElement[0].getAttribute(
          "current-value",
        );
    }

    // Destination Interrupt Line
    const destinationInterruptLineDropdownElement = await view.findWebElements(
      await destinationInterruptLineDropdown(destination),
    );
    if (
      destinationInterruptLineDropdownElement.length > 0 &&
      (await destinationInterruptLineDropdownElement[0].isDisplayed())
    ) {
      destinationInterruptLineValue =
        await destinationInterruptLineDropdownElement[0].getAttribute(
          "current-value",
        );
    }
  }

  const destinationConfig: DestinationConfig = {
    PRIORITY: destinationStreamPriorityValue,
    ...(destinationStreamAliasValue !== undefined && {
      ALIAS: destinationStreamAliasValue,
    }),
    ...(destinationStreamBufferInterruptValue !== undefined && {
      INT_BUFFER_EN:
        destinationStreamBufferInterruptValue === "true" ? "TRUE" : "FALSE",
    }),
    ...(destinationStreamWindowInterruptValue !== undefined && {
      INT_WINDOW_EN:
        destinationStreamWindowInterruptValue === "true" ? "TRUE" : "FALSE",
    }),
    ...(destinationInterruptPriorityValue !== undefined && {
      INT_PRIORITY: destinationInterruptPriorityValue,
    }),
    ...(destinationInterruptLineValue !== undefined && {
      INT_LINE_DEST: destinationInterruptLineValue,
    }),
    ...(destinationStreamBufferSizeValue !== undefined && {
      INT_BUFFER_SIZE: destinationStreamBufferSizeValue,
    }),
    ...(destinationStreamWindowSizeValue !== undefined && {
      INT_WINDOW_SIZE: destinationStreamWindowSizeValue,
    }),
  };
  return destinationConfig;
}

export async function sourceToggleInputs(
  view: WebView,
  source: string,
  windowSize: string,
  streamPriority: string,
): Promise<void> {
  await UIUtils.clickElement(view, await sourceWindowInterruptToggle(source));

  const sourceWindowSizeInputElement = await UIUtils.findWebElement(
    view,
    await sourceWindowSizeInput(source),
  );
  await sourceWindowSizeInputElement.sendKeys(windowSize);

  const sourceStreamPriorityInput = await UIUtils.findWebElement(
    view,
    sourceStreamPriority(source),
  );
  await sourceStreamPriorityInput.sendKeys(streamPriority);
}

export async function destinationToggleInputs(
  view: WebView,
  destination: string,
  bufferInterruptSize: string,
  windowSize: string,
  streamPriority: string,
): Promise<void> {
  await UIUtils.clickElement(
    view,
    await destinationBufferInterruptToggle(destination),
  );

  const destinationBufferSizeInputElement = await UIUtils.findWebElement(
    view,
    await destinationBufferSizeInput(destination),
  );
  await destinationBufferSizeInputElement.sendKeys(bufferInterruptSize);

  await UIUtils.clickElement(
    view,
    await destinationWindowInterruptToggle(destination),
  );

  const destinationWindowSizeInputElement = await UIUtils.findWebElement(
    view,
    await destinationWindowSizeInput(destination),
  );
  await destinationWindowSizeInputElement.sendKeys(windowSize);

  const destinationStreamPriorityInput = await UIUtils.findWebElement(
    view,
    destinationStreamPriority(destination),
  );
  await destinationStreamPriorityInput.sendKeys(streamPriority);
}
