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

import React, {
  createContext,
  FunctionComponent,
  useContext,
  useState,
} from "react";
import { SocDataType } from "../../../common/types/soc-data";

interface FormData {
  projectName: string;
  projectLocation: string;
  soc: SocDataType.SoC | undefined;
  board: SocDataType.Board | undefined | string;
  boardType: "standard" | "custom",
  boardFileLocation: string,
  boardObj: SocDataType.Board | undefined;
  firmwarePlatform: string;
  firmwarePlatformObj: SocDataType.FirmwarePlatform | undefined;
  socPackage: SocDataType.Package | undefined,
  template: SocDataType.Template | undefined;
  projectNameError: boolean;
  projectLocationError: boolean;
  projectLocationSpaceError: boolean;
}

interface FormDataContextType {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: string | boolean | SocDataType.Template | undefined | SocDataType.Package | SocDataType.SoC | SocDataType.Board | SocDataType.FirmwarePlatform) => void;
}

//Context for the form data with an initial value of undefined
export const FormDataContext = createContext<FormDataContextType | undefined>(
  undefined
);

interface FormDataProviderProps {
  children: React.ReactNode;
}

//The provider component for the FormDataContext which will encapsulate any components that need access to form data.
export const FormDataProvider: FunctionComponent<FormDataProviderProps> = ({
  children,
}) => {
  //State to store all form data and the state is initialized with an empty object
  const [formData, setFormData] = useState<FormData>({
    projectName: "",
    projectLocation: "",
    soc: undefined,
    board: undefined,
    boardType: "standard",
    boardFileLocation: "",
    boardObj: undefined,
    firmwarePlatform: "",
    firmwarePlatformObj: undefined,
    socPackage: undefined,
    template: undefined,
    projectNameError: false,
    projectLocationError: false,
    projectLocationSpaceError: false,
  });

  //Function to update individual fields in the form data
  const updateFormData = (field: keyof FormData, value: string | boolean | SocDataType.Template | undefined | SocDataType.Package | SocDataType.SoC | SocDataType.Board | SocDataType.FirmwarePlatform) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const contextValue: FormDataContextType = {
    formData,
    updateFormData,
  };

  //The provider passes the current form data and the update function to its children
  return (
    <FormDataContext.Provider value={contextValue}>
      {children}
    </FormDataContext.Provider>
  );
};

//Custom hook for consuming our FormDataContext
export const useFormData = () => {
  const context = useContext(FormDataContext);
  if (!context)
    throw new Error("useFormData must be used within a FormDataProvider");
  return context;
};
