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

import * as React from "react";

import "./App.scss";
import { NewProjectWizardPage } from "./components/new-project-wizard-page";
import { NavigationBar } from "../../top-nav/navigation-bar";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NewProjectWizardPath } from "./constants";

const App = () => {
  return (
    <div className="app">
      <MemoryRouter>
        <NavigationBar />
        <div className="container">
          <div className="content">
            <Routes>
              <Route path={NewProjectWizardPath} element={<NewProjectWizardPage />} />
            </Routes>
          </div>
        </div>
      </MemoryRouter>
    </div>
  );
};

export default App;