/**
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
export default `<%
// Get the common base processor for this part in the project.
it.projectInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32675C":
      return "MAX32675";
  }
  return soc;
};

// Get the common base processor for this part in JLink debug.
it.jlinkInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32675C":
      return "MAX32675";
  }
  return soc;
};

// Get the common base processor for this part in openocd debug.
it.openocdInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32675C":
      return "MAX32675";
    case "ADSP-21834":
    case "ADSP-21834W":
    case "ADSP-21835":
    case "ADSP-21835W":
    case "ADSP-21836":
    case "ADSP-21836W":
    case "ADSP-21837":
    case "ADSP-21837W":
      return "ADSP2183X";
    case "ADSP-SC834":
    case "ADSP-SC834W":
    case "ADSP-SC835":
    case "ADSP-SC835W":
      return "ADSPSC83X";
  }
  return soc;
};

// Get the common base processor for this part in the MSDK.
it.msdkInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32675C":
      return "MAX32675";
    case "MAX32658":
      return "MAX32657";
    case "MAX32666":
      return "MAX32665";
  }
  return soc;
};

// Get the common base processor for this part in Zephyr.
it.zephyrInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32675C":
      return "MAX32675";
    case "MAX32658":
      return "MAX32657";
  }
  return soc;
};

// Get the common base processor for the zephyr board name utility.
it.zephyrBoardNameInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32675C":
      return "MAX32675";
  }
  return soc;
};

// Get the common base processor for this part in TFM.
it.tfmInflectionPoint = function(soc) {
  switch (soc) {
    case "MAX32658":
      return "MAX32657";
  }
  return soc;
};


// Get the common base processor for the sharcfx board name utility.
it.sharcfxBoardNameInflectionPoint = function(soc) {
  switch (soc) {
    case "ADSP-21834":
    case "ADSP-21834W":
    case "ADSP-21835":
    case "ADSP-21835W":
    case "ADSP-21836":
    case "ADSP-21836W":
    case "ADSP-21837":
    case "ADSP-21837W":
      return "ADSP21835W";
    case "ADSP-SC834":
    case "ADSP-SC834W":
    case "ADSP-SC835":
    case "ADSP-SC835W":
      return "ADSPSC835W";
  }
  return soc;
};
%>
`;
