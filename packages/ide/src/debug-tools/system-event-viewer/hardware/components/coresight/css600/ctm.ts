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
 * This class represent ARM Coresight Cross Trigger Matrix (CTM),
 * which allows to interconnect multiple CTIs for trigger routing.
 *
 * Note that CTM does not have any configuration so this class is only a spetialization
 * of SoCTraceComponent to model the CTI interconnection.
 *
 * DISCLAIMER: This class is still under development with limited logic implemented.
 *
 * More information can be found on:
 * - ARM® CoreSight™ System-on-Chip SoC-600 Technical Reference Manual:
 *   https://developer.arm.com/documentation/100806/latest/
 *
 */
export class Css600Ctm implements SoCTraceComponent {
  readonly Ctis: string;
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
  ) {
    // TODO: Improve type safety
    this.type = socTraceInfo.Type as string;
    this.Ctis = socTraceInfo.Ctis as string;
  }

  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    const channel = parseInt(signal);

    // TODO: Validate channel

    return Object.values(this.Ctis).map((cti) => ({
      sourceSignal: `Channel.${channel}`,
      componentSourceSignal: signal,
      componentDestinationSignal: `Channel.${channel}`,
      destinationSignal: `${cti}.Channel.${channel}`,
      isActive: true,
    }));
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
