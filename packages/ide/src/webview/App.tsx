/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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
import { HomePage } from "./pages/home-page/home-page";
import { NavigationBar } from "./top-nav/navigation-bar";

import "./App.scss";

const App = () => {
  return (
    <div className="app">
      <NavigationBar />
      <div className="container">
        <div className="content">
          <HomePage />
        </div>
      </div>
    </div>
  );
};

export default App;
