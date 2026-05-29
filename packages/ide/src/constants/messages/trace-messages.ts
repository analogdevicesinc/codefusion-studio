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

import type { NotificationType, RequestType } from "vscode-messenger-common";
import {
  SerialPort,
  TraceConfiguration,
  TraceRecordingState,
} from "@ide-types/trace-types";

export const traceConfigRequest: RequestType<void, TraceConfiguration> = {
  method: "trace-get-configuration",
};

export const traceConfigUpdateNotification: NotificationType<TraceConfiguration> =
  {
    method: "trace-update-configuration",
  };

export const traceConfigChangedNotification: NotificationType<TraceConfiguration> =
  {
    method: "trace-configuration-changed",
  };

export const traceRecordingStateRequest: RequestType<
  void,
  TraceRecordingState
> = {
  method: "trace-get-recording-state",
};

export const traceStartRecordingNotification: NotificationType<void> = {
  method: "trace-start-recording",
};

export const traceStopRecordingNotification: NotificationType<void> = {
  method: "trace-stop-recording",
};

export const traceRecordingStateChangedNotification: NotificationType<TraceRecordingState> =
  {
    method: "trace-recording-state-changed",
  };

export const traceSerialPortsRequest: RequestType<void, SerialPort[]> = {
  method: "trace-get-serial-ports",
};

export const traceOpenConfigurationViewNotification: NotificationType<void> = {
  method: "trace-open-configuration-view",
};
