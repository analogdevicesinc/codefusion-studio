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
import { Css600TmcBase } from "./tmc-base";
import type { SessionResolver } from "../coresight";

/**
 * This class implements SoCTraceComponent interface for
 * Coresight Embedded Trace FIFO (ETF) configuration of TMC by extending
 * Css600TmcBase.
 */
export class Css600TmcEtf extends Css600TmcBase implements SoCTraceComponent {
  readonly type: string;
  readonly AtbReceiver: string;
  readonly AtbTransmitter: string;

  /**
   *
   * @param name Unique name to identify the component in the system.
   *             This is currently only used on error messages with no logic associated.
   * @param socTraceInfo Record containing information from the data model.
   * @param resolveSession Returns the debug session to use for register/memory access.
   */
  constructor(
    public name: string,
    socTraceInfo: SocTraceComponentInfo,
    resolveSession: SessionResolver,
  ) {
    super(resolveSession, socTraceInfo);
    this.type = socTraceInfo.Type as string;
    this.AtbReceiver = socTraceInfo.AtbReceiver as string;
    this.AtbTransmitter = socTraceInfo.AtbTransmitter as string;
  }

  async getConnections(
    signal: string,
    offline?: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    switch (signal) {
      case "AtbReceiver":
        return [
          {
            sourceSignal: this.AtbReceiver,
            componentSourceSignal: signal,
            componentDestinationSignal: `AtbTransmitter`,
            destinationSignal: this.AtbTransmitter,
            isActive: offline ? undefined : true,
          },
        ];
      case "AtbTransmitter":
        return [
          {
            sourceSignal: this.AtbTransmitter,
            componentSourceSignal: signal,
            componentDestinationSignal: `AtbReceiver`,
            destinationSignal: this.AtbReceiver,
            isActive: offline ? undefined : true,
          },
        ];
      default:
        throw new Error(
          `Signal ${signal} is not a valid input for ${this.name}.`,
        );
    }
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

  async getConnection(): Promise<SoCTraceComponentConnection[] | undefined> {
    return undefined;
  }
}
