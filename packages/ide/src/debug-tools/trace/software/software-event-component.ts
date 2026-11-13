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
 * Software event decoder component that implements SoCTraceComponent.
 *
 * Exposes software decoders (e.g., Zephyr STMESP) as first-class trace
 * components in the SoC trace routing network. All decoder inputs and
 * outputs are declared dynamically based on the decoders' signal topology.
 *
 * Input signals follow the pattern: "SWStimulusInput.<decoder-kind>"
 * Output signals are declared by each decoder: "TracePoints", "LOG", etc.
 *
 * Decoder inputs can be enabled independently and are exposed through
 * SoCTraceComponent connection metadata for routing.
 */

import type {
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../trace-types";
import type { Stm500 } from "../hardware/coresight/stm-500";
import { SocTraceEventSourceGroup } from "cfs-types";
import { type TraceEvent } from "../trace-manager";
import { StpItem } from "../parsers/stp-parser";
import { ZephyrDecoder, SWEVENTS } from "./zephyr-decoder";

/**
 * Represents the software event decoding subsystem as a SoCTraceComponent.
 *
 * Hosts the Zephyr software decoder and exposes its signals via the
 * SoCTraceComponent interface, allowing the routing system to treat
 * SW decoding the same way as HW signal routing.
 */
export class SoftwareEventComponent implements SoCTraceComponent {
  readonly type = "sw-event-decoder";
  readonly name: string;
  private ZephyrDecoder: ZephyrDecoder;

  constructor(
    name: string,
    private stm500: Stm500,
  ) {
    this.name = name;
    this.ZephyrDecoder = new ZephyrDecoder(this.name);
    this.stm500.registerSWStimulusEventsSourceSignal(`${this.name}.OutputPort`);
  }

  /**
   * Retrieves all potential connections for a given input or output signal.
   *
   * @param signal - Signal identifier (e.g. "SWStimulusInput.zephyr-stmesp",
   *                  "LOG", "TracePoints", etc.)
   * @param offline - When `true`, omit live decoder state (`isActive` is `undefined`).
   * @returns Array of available connections for the signal.
   */
  async getConnections(
    signal: string,
    offline?: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    const [first] = signal.split(/\.(.*)/);
    switch (first) {
      case `InputPort`: {
        const originSignal =
          this.ZephyrDecoder.inputPorts[signal]?.originSignal ??
          `${this.name}.${signal}`;
        return [
          {
            sourceSignal: originSignal,
            componentSourceSignal: signal,
            componentDestinationSignal: "OutputPort",
            destinationSignal: `${this.stm500.name}.${this.stm500.eventsSourceSignal}`,
            isActive: offline
              ? undefined
              : this.ZephyrDecoder.inputPorts[signal]?.enabled,
          },
        ];
      }

      case `OutputPort`:
        const soCTraceComponentConnections: SoCTraceComponentConnection[] = [];

        for (const [input, config] of Object.entries(
          this.ZephyrDecoder.inputPorts,
        )) {
          soCTraceComponentConnections.push({
            sourceSignal: `${this.stm500.name}.${this.stm500.eventsSourceSignal}`,
            componentSourceSignal: signal,
            componentDestinationSignal: input,
            destinationSignal: config.originSignal ?? `${this.name}.${input}`,
            isActive: offline ? undefined : config.enabled,
          });
        }
        return soCTraceComponentConnections;
    }

    throw new Error(`Unknown signal ${signal} for ${this.name}.`);
  }

  async connect(input: string, output: string): Promise<void> {
    if (output !== `OutputPort`) {
      throw new Error(
        `Invalid output signal: ${output} for ${this.name}. Expected: OutputPort`,
      );
    }

    if (!this.ZephyrDecoder) {
      throw new Error(
        `No decoders available for ${this.name}. Ensure that decoders are initialized before calling connect.`,
      );
    }

    // Allow coexistence on the selected decoder: only set requested input true.
    if (!this.ZephyrDecoder.inputPorts[input]) {
      throw new Error(`Invalid input signal: ${input} for ${this.name}.`);
    }
    this.ZephyrDecoder.inputPorts[input].enabled = true;
    if (!(await this.stm500.isSWStimulusEventsEnabled())) {
      await this.stm500.enableSWStimulusEvents();
    }
  }

  async disconnect(input: string, output: string): Promise<void> {
    if (output !== `OutputPort`) {
      throw new Error(
        `Invalid output signal: ${output} for ${this.name}. Expected: OutputPort`,
      );
    }

    if (!this.ZephyrDecoder) {
      throw new Error(`Invalid input signal: ${input} for ${this.name}.`);
    }

    if (!this.ZephyrDecoder.inputPorts[input]) {
      throw new Error(`Invalid input signal: ${input} for ${this.name}.`);
    }

    this.ZephyrDecoder.inputPorts[input].enabled = false;

    if (
      Object.values(this.ZephyrDecoder.inputPorts).every(
        (value) => value.enabled === false,
      )
    ) {
      // LOG packets when only TracePoints is disconnected while LOG stays active.
      await this.stm500.disableSWStimulusEvents();
    }
  }

  getEventSources(): SocTraceEventSourceGroup {
    return { [SWEVENTS]: this.ZephyrDecoder.getEventSources() };
  }

  async decodeEvents(
    stpItems: StpItem[],
    pathToExecutable: string | undefined,
  ): Promise<TraceEvent[]> {
    return await this.ZephyrDecoder.decode(stpItems, pathToExecutable);
  }
}
