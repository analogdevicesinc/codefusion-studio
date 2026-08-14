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

export type UsbDeviceSelection = {
  busNumber: number;
  deviceAddress: number;
};

export type TraceSourceConfiguration =
  | {
      type: "uart";
      serialPort: string;
      baudRate: number;
    }
  | {
      type: "usb";
      // Undefined until a device has been selected from the USB dropdown.
      usbDevice?: UsbDeviceSelection;
    };

export type TraceConfiguration = {
  source: TraceSourceConfiguration;
  outputDirectory: string;
  autoReset: boolean;
  elfFile: string;
  buildDir: string;
  // Ai model file paths
  aiModels: string[];
};

export type UsbDevice = UsbDeviceSelection & {
  label: string;
};

export type TraceRecordingState =
  | {
      isRecording: true;
      startTime: number;
    }
  | {
      isRecording: false;
      error?: string;
    };

export type SerialPort = {
  path: string;
};
