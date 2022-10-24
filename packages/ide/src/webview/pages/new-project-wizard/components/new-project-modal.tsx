/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import React, { ReactNode, useEffect, useRef } from "react";
import { useState } from "react";

import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeRadio,
  VSCodeRadioGroup,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";

import {
  GridCombobox,
  GridComboboxHandle,
  InfoIcon,
  SearchIcon,
} from "cfs-react-library";

import Tooltip from "../../../../webviews/common/components/tooltip/Tooltip";
import { vscode } from "../../../utilities/vscode";

import { useFormData } from "./form-data-context";
import {
  BROWSE_FOLDERS,
  BROWSE_FOR_BOARDS,
  CHECK_FILE_EXISTS,
} from "../../../../../src/constants";

import "../styles/new-project-modal.scss";
import { SocDataType } from "../../../common/types/soc-data";

export const CreateProjectModalPage = ({
  defaultNewProjectLocation,
}: {
  defaultNewProjectLocation: string;
}) => {
  //Variables used for Project Name
  const [projectNameInput, setProjectNameInput] = useState("");
  const [projectNameError, setProjectNameError] = useState(false);
  const [projectNameErrorText, setProjectNameErrorText] = useState("");

  //Variables used for Project Location
  const [projectLocationError, setProjectLocationError] = useState(false);
  const [projectLocationErrorText, setProjectLocationErrorText] = useState("");

  const [projectLocationSpaceError, setProjectLocationSpaceError] = useState(false)
  const [projectLocationSpaceErrorText, setProjectLocationSpaceErrorText] = useState("")

  //Variables used for SOC
  const [selectedSoc, setSelectedSoc] = useState<SocDataType.SoC>();

  //Variables used for Boards
  const [boardType, setBoardType] = useState<"standard" | "custom">("standard");
  const [selectedBoard, setSelectedBoard] = useState<
    SocDataType.Board | undefined
  >();
  const [boardOptions, setBoardOptions] = useState<SocDataType.Board[]>([]);
  const [boardFileLocation, setBoardFileLocation] = useState("");
  const [boardLocationErrorText, setBoardLocationErrorText] = useState("");
  const [boardLocationError, setBoardLocationError] = useState(false);
  const [inferredBoardName, setInferredBoardName] = useState("");
  const [showInferredBoard, setShowInferredBoard] = useState(false);

  //Variables used for Firmware Platform
  const [selectedFirmwarePlatform, setSelectedFirmwarePlatform] = useState("");
  const [firmwarePlatforms, setFirmwarePlatforms] = useState<string[]>([]);
  const [selectedFirmwarePlatformObj, setSelectedFirmwarePlatformObj] =
    useState<SocDataType.FirmwarePlatform | undefined>(undefined);

  //Variables used for Package
  const [displayPackages, setDisplayPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<
    SocDataType.Package | undefined
  >();
  const [packageOptions, setPackageOptions] = useState<SocDataType.Package[]>([]);

  //Variables used for Template
  const [templateOptions, setTemplateOptions] = useState<SocDataType.Template[]>(
    [],
  );
  const [selectedTemplate, setSelectedTemplate] = useState<SocDataType.Template>();
  const templateComboRef = useRef<GridComboboxHandle>(null);

  //Variables used for Project Location
  const [useDefaultLocation, setUseDefaultLocation] = useState(true);
  const [projectLocation, setProjectLocation] = useState(
    defaultNewProjectLocation,
  );

  //SocData Object
  const [socOptions, setSocOptions] = useState<SocDataType.Data | undefined>(undefined);

  const { updateFormData } = useFormData();

  interface ExtensionMessage {
    command: string;
    path: string;
    data?:
    | boolean
    | { locationValid: boolean; nameValid: boolean }
    | {
      boardLocationValid: boolean;
      targetValid: boolean;
      inferredBoardName: string;
    } | SocDataType.Data
    ;
  }

  /**
   * React Hooks
   */
  //Setting the default Project location
  useEffect(() => {
    setProjectLocation(defaultNewProjectLocation);
  }, [defaultNewProjectLocation]);

  // Update Board List and package options. Resets selected board and package.
  useEffect(() => {
    const boardList = selectedSoc?.boards ?? [];
    setBoardOptions(boardList);
    clearBoard();

    setPackageOptions(selectedSoc?.packages ?? []);
    clearSelectedPackage();
  }, [selectedSoc]);

  //Updating the firmware platform based on the selected package
  useEffect(() => {
    updateFirmwarePlatformList(selectedPackage?.name);
    clearFirmwarePlatform();
  }, [selectedPackage, selectedBoard]);

  //Update the template options based on the firmware selection
  useEffect(() => {
    updateTemplateOptionList(selectedFirmwarePlatform);
    templateComboRef.current?.clearInput();
    clearSelectedTemplate();
  }, [selectedFirmwarePlatform]);

  useEffect(() => {
    window.addEventListener("message", handleMessageFromExtension);
    return (() => {
      window.removeEventListener("message", handleMessageFromExtension);
    })
  });

  //This use effect is trigger just once on load
  useEffect(() => {
    vscode.postMessage({
      command: "getSocData"
    })
  }, [])

  function fileExists(name: string, location: string) {
    vscode.postMessage({
      command: CHECK_FILE_EXISTS,
      data: { location, name },
    });
  }

  /**
   * Sends a message to check if the custom board is valid.
   * @param {string} location: Absolute path to the board file
   * @param {string} socName: Soc name
   */
  function checkCustomBoard(location: string, socName: string) {
    vscode.postMessage({
      command: "checkCustomBoard",
      data: { location, socName },
    });
  }

  /**
   *  Validates project name
   * @param {string} projectName: Project Name
   */
  function validateProjectName(projectName: string) {
    const folderNameRegex = new RegExp('^[^\\/?%*:|"<>.]+$');
    if (!folderNameRegex.test(projectName)) {
      setProjectNameError(true);
      setProjectNameErrorText("Project name contains invalid characters.");
      updateFormData("projectNameError", true);
    } else {
      setProjectNameError(false);
      setProjectNameErrorText("");
      updateFormData("projectNameError", false);
    }

    if (!projectName.trim()) {
      setProjectNameError(true);
      setProjectNameErrorText("Project name cannot be an empty string.");
      updateFormData("projectNameError", true);
    }

    if (/\s/.test(projectName)) {
      setProjectNameError(true);
      setProjectNameErrorText("Project name cannot contain spaces.");
      updateFormData("projectNameError", true);
    }
  }

  function handleProjectName(event: unknown) {
    const customEvent = event as Event & { target: { _currentValue: string } };
    const value = customEvent.target._currentValue;
    setProjectNameInput(value);
    updateFormData("projectName", value);
    fileExists(value, projectLocation);
    validateProjectName(value);
  }

  /**
   * Updates the board list based on the Soc selected in the gridbox. Updates the data form with soc value.
   * @param {string} value: Selected soc
   */
  function handleSocInput(value: string) {
    const matchedSoc = socOptions?.data.soc.find(
      (soc) => soc.displayName === value,
    );
    if (matchedSoc) {
      setSelectedSoc(matchedSoc);
      updateFormData("soc", matchedSoc);
    } else {
      clearSoc();
    }
  }

  /**
   * Sets the value of Soc on row selection from the soc list. Updates the data form with soc value.
   * @param row
   */
  function handleSocSelection(row: string[]) {
    handleSocInput(row[0]);
  }

  /**
   * Clears the soc value in form data, clears the values of the dependent fields like the displayed boards list and firmware platform.
   */
  function clearSoc() {
    setSelectedSoc(undefined);
    updateFormData("soc", undefined);
    clearSelectedPackage();
    clearTemplateList();
    clearSelectedTemplate();
    clearSelectedPackage();
  }

  /**
   * Updated the template options list based on the selected soc, board, and firmware.
   * @param {string} firmwarePlatform: Selected firmware platform
   */
  function updateTemplateOptionList(firmwarePlatform: string) {
    const firmwarePlatformList = selectedPackage?.firmwarePlatform.find(
      (value) => value.displayName === firmwarePlatform,
    );

    if (firmwarePlatformList) {
      setTemplateOptions(firmwarePlatformList?.templates);
    } else {
      setTemplateOptions([]);
    }
  }

  /**
   * Sets selected template in the form data, if template is not found clears the stale selected template.
   * @param {string} templateName: Name of the selected template.
   */
  function handleTemplateInput(templateName: string) {
    const matchedTemplate = templateOptions.find(
      (template) => template.name === templateName,
    );

    if (matchedTemplate) {
      setSelectedTemplate(matchedTemplate);
      updateFormData("template", matchedTemplate);
    } else {
      clearSelectedTemplate();
    }
  }

  /**
   * Updates the template selected based on the selection in the template gridbox
   * @param {string[]} row: The selected row in the template gridbox
   */
  function handleTemplateSelection(row: string[]) {
    handleTemplateInput(row[0]);
  }

  /**
   * Clears the selected template from the variable and the form data.
   */
  function clearSelectedTemplate() {
    setSelectedTemplate(undefined);
    updateFormData("template", undefined);
  }

  /**
   * Clears the template list options for the gridbox
   */
  function clearTemplateList() {
    setTemplateOptions([]);
  }

  /**
   * Clears selected package from react variable and form data.
   */
  function clearSelectedPackage() {
    setSelectedPackage(undefined);
    updateFormData("socPackage", undefined);
  }

  /**
   * Updates the Soc package based on input package name.
   * @param {string} selectedPackageName: The name of the selected package
   */
  function updatePackage(selectedPackageName?: string) {
    const supportedPackage = selectedSoc?.packages.find(
      (value) => value.name === selectedPackageName,
    );

    setSelectedPackage(supportedPackage);
    updateFormData("socPackage", supportedPackage);
  }

  /**
   * Updates the firmware platform dropdown options based on the package name.
   * @param {string} packageName: The package name
   */
  function updateFirmwarePlatformList(packageName?: string) {
    const supportedPackage = packageOptions.find(
      (value) => value.name === packageName,
    );
    const firmwarePlatforms = supportedPackage?.firmwarePlatform ?? [];

    const firmwarePlatformsSupported = firmwarePlatforms.filter((platform) => {
      //Updating the platform list based on the extension of the custom board file selected
      if (boardType === "custom") {
        if (
          (platform.name === "msdk" && !boardFileLocation.endsWith("mk")) ||
          (platform.name === "zephyr-3.7" &&
            !boardFileLocation.endsWith("yaml"))
        ) {
          return false;
        } else {
          return true;
        }
      }

      //If the board type is standard populating the firmware platform list is populated iff msdkIndentifier and/or zephyrIdentifier are defined.
      else if (boardType === "standard") {
        if (
          (platform.name === "msdk" &&
            selectedBoard?.msdkIdentifier !== undefined) ||
          (platform.name === "zephyr-3.7" &&
            selectedBoard?.zephyrIdentifier !== undefined)
        ) {
          return true;
        } else {
          return false;
        }
      }
    });

    setFirmwarePlatforms(
      firmwarePlatformsSupported.map(
        (firmwarePlatform) => firmwarePlatform.displayName,
      ),
    );

    clearFirmwarePlatform();
  }

  /**
   * Updates the value of firmware platform in the variable as well as in the FormData based on the selected option in the vscode dropdown.
   * @param event
   */
  function handleFirmwarePlatformSelection(event: unknown) {
    const customEvent = event as Event & { detail: { _currentValue: string } };

    const value = customEvent.detail._currentValue;

    setSelectedFirmwarePlatform(value);
    const selectedObj = selectedPackage?.firmwarePlatform.find(
      (platform) => platform.displayName === value,
    );
    setSelectedFirmwarePlatformObj(selectedObj);

    if (value === "MSDK") {
      updateFormData("firmwarePlatform", "msdk");
    } else if (value === "Zephyr 3.7") {
      updateFormData("firmwarePlatform", "zephyr-3.7");
    }
    updateFormData("firmwarePlatformObj", selectedObj);
  }

  /**
   * Clears the firmware platform form the variable and the FormData.
   */
  function clearFirmwarePlatform() {
    setSelectedFirmwarePlatform("");
    setSelectedFirmwarePlatformObj(undefined);
    updateFormData("firmwarePlatform", "");
    updateFormData("firmwarePlatformObj", undefined);
  }

  /**
   * Updates the selected package based on selected option in package dropdown
   * @param event: Selection event
   */
  function handlePackageSelection(event: unknown) {
    const customEvent = event as Event & { detail: { _currentValue: string } };
    const value = customEvent.detail._currentValue;

    const selectedOption = packageOptions.find(
      (opt) => opt.displayName === value,
    );
    updatePackage(selectedOption?.name);
  }

  /**
   * Updates the selected board value in the local variable as well as form data. Updates the firmware platform list to be displayed based on the selected board and selected soc.
   * @param event: Selection event
   */
  function handleBoardSelection(event: unknown) {
    const customEvent = event as Event & { detail: { _currentValue: string } };
    const value = customEvent.detail._currentValue;

    const boardSelected = boardOptions.find(
      (board) => board.displayName === value,
    );

    setSelectedBoard(boardSelected);
    updateFormData("boardObj", boardSelected);
    updateFormData("board", value);

    updatePackage(boardSelected?.packageName);
  }

  /**
   * Resets the board value in local variable and the form data.
   */
  function clearBoard() {
    setSelectedBoard(undefined);
    updateFormData("boardObj", undefined);
    updateFormData("board", undefined);
  }

  /**
   *
   * @param {string} inferredBoardName: updates the
   */
  function handleInferredBoard(inferredBoardName: string) {
    if (inferredBoardName !== "") {
      //Updating board value in the form data
      updateFormData("board", inferredBoardName);
    }
  }

  function handleProjectLocation(event: unknown) {
    const customEvent = event as Event & { target: { _currentValue: string } };
    const value = customEvent.target._currentValue;
    setProjectLocation(value);
    updateFormData("projectLocation", value);
    fileExists(projectNameInput, value);
  }

  function handleBoardLocation(event: unknown) {
    const customEvent = event as Event & { target: { _currentValue: string } };
    const value = customEvent.target._currentValue;
    checkCustomBoard(value, selectedSoc?.name as string);
    setBoardFileLocation(value);
    updateFormData("boardFileLocation", value);

    setDisplayPackages(true);
  }

  /**
   * Based on the radio option selected updates board list, firmware platform, and package
   * @param event: Selection event
   */
  function handleBoardType(event) {
    const customEvent = event as Event & {
      target: { value: "custom" | "standard" };
    };
    setBoardType(customEvent.target.value);
    updateFormData("boardType", customEvent.target.value);
    if (customEvent.target.value === "custom") {
      setDisplayPackages(true);
      // Clearing firmware platform and templates when a custom board is selected
      clearFirmwarePlatform();
      setFirmwarePlatforms([]);
      clearSelectedTemplate();
      setTemplateOptions([]);
      clearSelectedPackage();
    } else {
      setDisplayPackages(false);
      updatePackage(selectedBoard?.packageName);
    }
  }

  function handleDefaultLocationCheckbox() {
    setUseDefaultLocation(!useDefaultLocation);
    setProjectLocation(defaultNewProjectLocation);
    fileExists(projectNameInput, defaultNewProjectLocation);
  }

  function updateInferredBoard(inferredBoard: string) {
    if (
      boardFileLocation.endsWith(".mk") ||
      boardFileLocation.endsWith(".yaml")
    ) {
      setShowInferredBoard(true);
      setInferredBoardName(inferredBoard);
    }
  }

  function handleMessageFromExtension(event: MessageEvent<ExtensionMessage>) {
    switch (event.data.command) {
      case "selectedFolder":
        setProjectLocation(event.data.path);
        updateFormData("projectLocation", event.data.path);
        fileExists(projectNameInput, event.data.path);
        break;
      case "selectedBoardFile":
        setBoardFileLocation(event.data.path);
        updateFormData("boardFileLocation", event.data.path);
        if (selectedSoc) {
          checkCustomBoard(event.data.path, selectedSoc.name);
        }
        break;
      case "checkFileExistsResponse":
        const responseData = event.data.data as {
          locationValid: boolean;
          nameValid: boolean;
          locationHasSpaces: boolean;
        };
        if (!responseData.locationValid) {
          setProjectLocationError(true);
          setProjectLocationErrorText("Project location does not exist.");
          updateFormData("projectLocationError", true);
        } else {
          setProjectLocationError(false);
          updateFormData("projectLocationError", false);
        }
        if (responseData.nameValid) {
          setProjectNameError(true);
          updateFormData("projectNameError", true);
          setProjectNameErrorText("Project name already exists.");
        } else {
          validateProjectName(projectNameInput);
        }

        if (responseData.locationHasSpaces) {
          updateFormData('projectLocationSpaceError', true)
          setProjectLocationSpaceError(true);
          setProjectLocationSpaceErrorText(
            "Project location cannot contain spaces.",
          );
        } else {
          setProjectLocationSpaceError(false);
          updateFormData("projectLocationSpaceError", false);
        }
        break;
      case "checkBoardFileExistsResponse":
        const boardData = event.data.data as {
          boardLocationValid: boolean;
          targetValid: boolean;
          inferredBoardName: string;
        };
        if (!boardData.boardLocationValid) {
          setBoardLocationError(true);
          setBoardLocationErrorText("File does not exist.");
          setShowInferredBoard(false);
          setInferredBoardName("");
          setFirmwarePlatforms([]);
        } else if (!boardData.targetValid) {
          setBoardLocationError(true);
          setBoardLocationErrorText(
            "The processor and board file don't match. Please correct.",
          );
          setShowInferredBoard(false);
          setInferredBoardName("");
          setFirmwarePlatforms([]);
        } else {
          setBoardLocationError(false);
          setBoardLocationErrorText("");
          updateInferredBoard(boardData.inferredBoardName);
          handleInferredBoard(boardData.inferredBoardName);
        }
        break;
      case "socData":
        const socDataMessage = event.data.data as SocDataType.Data;
        setSocOptions(socDataMessage);
    }
  }

  function handleDirectoryChange() {
    vscode.postMessage({
      command: BROWSE_FOLDERS,
    });
  }

  function handleBoardBrowse() {
    vscode.postMessage({
      command: BROWSE_FOR_BOARDS,
    });
  }

  //TODO: don't show field if custom board is not valid
  return (
    socOptions ?
      (<div className="modal">
        <h1>Create a project</h1>
        <p className="description">
          Ensure you have the details of the SoC at hand. Our project wizard
          guides you through the steps to create your new project.
        </p>
        <div className="input-block">
          {/* Name of the Project */}
          <div className="inputs">
            <label>
              <div className="input-field-name">Project name</div>
              <div className="vscode-text-field-container">
                <VSCodeTextField
                  className={`${projectNameError ? "vscode-text-field-err" : ""
                    } vscode-text-field`}
                  value={projectNameInput}
                  placeholder="Start typing..."
                  onInput={handleProjectName}
                ></VSCodeTextField>
              </div>

              {projectNameError && (
                <div className="err">{projectNameErrorText}</div>
              )}
            </label>
          </div>

          {/* Selecting the soc */}
          <div className="inputs">
            <GridCombobox
              headings={["Name", "Description"]}
              grid={socOptions.data.soc.map((opt) => {
                return [opt.displayName, opt.description];
              })}
              label="Processor"
              placeholder={`Search SOCs (${socOptions.data.soc.length} available)`}
              prefixIcon={<SearchIcon />}
              onClear={clearSoc}
              onInput={handleSocInput}
              onRowSelection={handleSocSelection}
              disabled={projectNameInput === ""}
            ></GridCombobox>
          </div>

          {/* Selecting the board  */}
          <div className="inputs board">
            <label htmlFor="board-dropdown" className="input-field-name">
              Board
            </label>
            <VSCodeRadioGroup
              className="vscode-radio-group"
              value={boardType}
              onChange={handleBoardType}
              disabled={!selectedSoc}
            >
              <VSCodeRadio value="standard">Standard</VSCodeRadio>
              <VSCodeRadio value="custom">Custom</VSCodeRadio>
            </VSCodeRadioGroup>

            {boardType === "standard" ? (
              //If Board type is standard display supported boards
              <>
                <VSCodeDropdown
                  id="board-dropdown"
                  className="input-dropdown"
                  position="below"
                  value={selectedBoard?.displayName}
                  onChange={handleBoardSelection}
                  disabled={!selectedSoc}
                >
                  <VSCodeOption value="">Select EV Kit</VSCodeOption>
                  {
                    boardOptions.map((board) => {
                      return (
                        <VSCodeOption key={board.name}>
                          {board.displayName}
                        </VSCodeOption>
                      );
                    }) as ReactNode[]
                  }
                </VSCodeDropdown>
                {selectedBoard !== undefined ? (
                  <>
                    <div className="board-package-info">
                      <div>
                        Processor Package:{" "}
                        <span className="bold-board-package-info">
                          {selectedPackage?.displayName}
                        </span>
                        <Tooltip
                          type="long"
                          title="Processor package for the selected board."
                        >
                          <button
                            aria-label="Processor package for the selected board."
                            className="tooltip-button"
                          >
                            <InfoIcon />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </>
                ) : (
                  <></>
                )}
              </>
            ) : (
              <>
                <div className="board-description">
                  <div>
                    Please enter or select your custom board file location.
                    <Tooltip
                      type="long"
                      title="Please ensure the processor you have selected and the custom board file type are compatible."
                    >
                      <button
                        aria-label="Please ensure the processor you have selected and the custom board file type are compatible."
                        className="tooltip-button"
                      >
                        <InfoIcon />
                      </button>
                    </Tooltip>
                  </div>
                  <div>
                    Note: "myboard.mk" for MSDK, "myboard.yaml" for Zephyr.
                  </div>
                </div>
                <div className="vscode-text-field-container">
                  <VSCodeTextField
                    disabled={!selectedSoc}
                    value={boardFileLocation}
                    className={`${boardLocationError ? "vscode-text-field-err" : ""
                      } vscode-text-field`}
                    onInput={handleBoardLocation}
                  />
                  <VSCodeButton
                    appearance="secondary"
                    disabled={!selectedSoc}
                    onClick={handleBoardBrowse}
                    className="browse-button"
                  >
                    Browse
                  </VSCodeButton>
                </div>
                {boardLocationError && (
                  <div className="err">{boardLocationErrorText}</div>
                )}
                {showInferredBoard && (
                  <div className="board-package-info">
                    <div>
                      Board Name:{" "}
                      <span className="bold-board-package-info">
                        {inferredBoardName}
                      </span>
                      <Tooltip
                        type="long"
                        title="The 'BOARD' string to be passed to the build system."
                      >
                        <button
                          aria-label="The 'BOARD' string to be passed to the build system."
                          className="tooltip-button"
                        >
                          <InfoIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                )}
                {/* Display and select Package */}
                {displayPackages && showInferredBoard ? (
                  <div className="inputs">
                    <label
                      htmlFor="packages-dropdown"
                      className="input-field-name"
                    >
                      Package
                    </label>
                    <VSCodeDropdown
                      id="packages-dropdown"
                      className="input-dropdown"
                      position="below"
                      value={selectedPackage?.displayName}
                      onChange={handlePackageSelection}
                      disabled={!packageOptions.length}
                    >
                      <VSCodeOption value="">Select Package</VSCodeOption>
                      {
                        packageOptions.map((packageOpt) => {
                          return (
                            <VSCodeOption key={packageOpt.name}>
                              {packageOpt.displayName}
                            </VSCodeOption>
                          );
                        }) as ReactNode[]
                      }
                    </VSCodeDropdown>
                  </div>
                ) : (
                  <></>
                )}
              </>
            )}
          </div>

          {/* Select the Firmware Platform */}
          <div className="inputs">
            <label
              htmlFor="firmwarePlatform-dropdown"
              className="input-field-name"
            >
              Firmware Platform
            </label>
            <VSCodeDropdown
              id="firmwarePlatform-dropdown"
              className="input-dropdown"
              position="below"
              value={selectedFirmwarePlatform}
              onChange={handleFirmwarePlatformSelection}
              disabled={!firmwarePlatforms.length}
            >
              <VSCodeOption value="">Select Firmware Platform</VSCodeOption>
              {
                firmwarePlatforms.map((boardName) => {
                  return <VSCodeOption key={boardName}>{boardName}</VSCodeOption>;
                }) as ReactNode[]
              }
            </VSCodeDropdown>
          </div>

          {/* Select the template */}
          <div className="inputs">
            <GridCombobox
              headings={["Template", "Description"]}
              grid={templateOptions.map((value) => {
                return [value.name, value.description];
              })}
              label="Template"
              placeholder={`Search Templates (${templateOptions.length} available)`}
              prefixIcon={<SearchIcon />}
              disabled={!templateOptions.length}
              onClear={clearSelectedTemplate}
              onInput={handleTemplateInput}
              onRowSelection={handleTemplateSelection}
              ref={templateComboRef}
            ></GridCombobox>
          </div>

          {/* Select Project Location */}
          <div className="inputs">
            <div className="input-field-name">Project Location</div>
            <div>
              <VSCodeCheckbox
                checked={useDefaultLocation}
                onClick={handleDefaultLocationCheckbox}
              >
                Use default location
              </VSCodeCheckbox>
            </div>
            <div className="vscode-text-field-container">
              <VSCodeTextField
                disabled={useDefaultLocation}
                className={`${projectLocationError ? "vscode-text-field-err" : ""
                  } vscode-text-field`}
                value={projectLocation}
                onInput={handleProjectLocation}
              />
              <VSCodeButton
                appearance="secondary"
                disabled={useDefaultLocation}
                onClick={handleDirectoryChange}
                className="browse-button"
              >
                Browse
              </VSCodeButton>
            </div>

            {projectLocationError && (
              <div className="err">{projectLocationErrorText}</div>
            )}

            {projectLocationSpaceError && (
              <div className="err">{projectLocationSpaceErrorText}</div>
            )}
          </div>
        </div>
      </div>
      ) : <div> Loading.... </div>)
};
