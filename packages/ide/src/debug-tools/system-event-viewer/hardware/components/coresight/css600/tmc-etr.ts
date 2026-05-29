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

import { CfsDebugManager } from "../../../../../debug-manager";
import {
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../../../trace-types";
import type { SocTraceComponentInfo } from "cfs-types";
import { Css600TmcBase } from "./tmc-base";

/**
 * This class implements SoCTraceComponent interface for
 * Coresight Embedded Trace Router (ETR) configuration of TMC by extending
 * Css600TmcBase.
 *
 * DISCLAIMER: This class is still under development with limited logic implemented.
 */
export class Css600TmcEtr extends Css600TmcBase implements SoCTraceComponent {
  readonly AtbReceiver: string;
  readonly type: string;

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
    debugManager: CfsDebugManager,
  ) {
    super(debugManager, socTraceInfo);
    this.type = socTraceInfo.Type as string;
    this.AtbReceiver = socTraceInfo.AtbReceiver as string;
  }

  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    if (signal !== "AtbReceiver") {
      throw new Error(`Only AtbReceiver input is supported for ${this.name}.`);
    }

    // For the moment asume there is no output.
    // In the future we may add the AXI interface.
    return [];
  }

  connect(input: string, output: string): Promise<void> {
    void input;
    void output;
    throw new Error("Method not implemented.");
  }

  async disconnect(input: string, output: string): Promise<void> {
    void input;
    void output;
    throw new Error("Method not implemented.");
  }
}
