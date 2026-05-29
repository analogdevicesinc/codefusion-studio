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

import {
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../../../trace-types";
import type { SocTraceComponentInfo } from "cfs-types";

/**
 * This class allow interaction with ARM Coresight Trace Port Interface Unit (TPIU),
 * which allows to extract ATB trace data from the SoC for an external Trace Port Analyzer.
 *
 * DISCLAIMER: This class is still under development with limited logic implemented.
 *
 * More information can be found on:
 * - ARM® CoreSight™ System-on-Chip SoC-600 Technical Reference Manual:
 *   https://developer.arm.com/documentation/100806/latest/
 *
 */
export class Css600Tpiu implements SoCTraceComponent {
  readonly BaseAddress: number;
  readonly type: string;
  readonly AtbReceiver: string;

  /**
   *
   * @param name Unique name to identify the component in the system.
   *             This is currently only used on error messages with no logic associated.
   * @param socTraceInfo Record containing information from the data model.
   * @param debugManager Debug manager used to read and write registers of the component.
   */
  constructor(
    public name: string,
    socTraceInfo: SocTraceComponentInfo,
  ) {
    // TODO: Improve type safety
    this.BaseAddress = parseInt(socTraceInfo.BaseAddress as string, 16);
    this.type = socTraceInfo.Type as string;
    this.AtbReceiver = socTraceInfo.AtbReceiver as string;
  }

  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    if (signal !== "AtbReceiver") {
      throw new Error(`Only AtbReceiver input is supported for ${this.name}.`);
    }

    // TPIU has no outputs
    return [];
  }

  connect(): Promise<void> {
    throw new Error("TPIU has no outputs to route to.");
  }

  async disconnect(): Promise<void> {
    throw new Error("TPIU has no outputs to route to.");
  }
}
