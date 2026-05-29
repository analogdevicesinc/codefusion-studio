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

/**
 * Represents a connection between a queried component (componentA) and
 * another component (componentB).
 * This can represent a connection downstream (queried component output
 * is connected to another component input) or upstream (queried component
 * input is connected
 * to another component output).
 */
export interface SoCTraceComponentConnection {
  /**
   * The "external" signal that connects to the requested component signal.
   * If this represents a downstream connection, this is the output signal
   * of the previous component on the network.
   * If this represents an upstream connection, this is the input signal
   * of the next connected component.
   * This signal will start by component name followed by a dot and the
   * signal name (e.g. "ComponentB.signalX").
   */
  sourceSignal: string;

  /**
   * The signal name as defined on the component that is being queried.
   * Component name is not included.
   * When querying for componentA.signalX, this will be signalX
   *
   * Although this information is likely not necessary since it was part
   * of the query, it is included so the returned information is symmetric
   * and self contained.
   */
  componentSourceSignal: string;

  /**
   * The destination signal name as defined on the component that is being queried.
   * If this represents a downstream connection, this is the output signal
   * of the queried component.
   * If this represents an upstream connection, this is the input signal
   * of the queried component.
   * Signal name does not include the component name, only the signal name
   * as defined in the component description (e.g. "signalX")
   */
  componentDestinationSignal: string;

  /**
   * The "external" signal that connects to the corresponding connected component.
   * If this represents a downstream connection, this is the input signal
   * of the connected component.
   * If this represents an upstream connection, this is the output signal
   * of the connected component.
   * This signal will start by component name followed by a dot and the
   * signal name (e.g. "ComponentB.signalX").
   */
  destinationSignal: string;

  /**
   * Whether the connection is currently active or not.
   * A connection that is not active means that the connection can be enabled
   * on the current HW configuration, but it is currently disconnected.
   */
  isActive: boolean;

  /**
   * Example of connection:
   * |------------------|   |------------------|   |------------------|
   * |    ComponentA    |   |    ComponentB    |   |    ComponentC    |
   * |------------------|   |------------------|   |------------------|
   * |           output |<->| input     output |<->| input            |
   * |------------------|   |------------------|   |------------------|
   *
   * If the query was for ComponentB.input, the returned connection would be:
   * {
   *   sourceSignal: "ComponentA.output",
   *   componentSourceSignal: "input",
   *   componentDestinationSignal: "output",
   *   destinationSignal: "ComponentC.input",
   * }
   *
   * However if the query was for ComponentB.output, the returned connection would be:
   * {
   *   sourceSignal: "ComponentC.input",
   *   componentSourceSignal: "output",
   *   componentDestinationSignal: "input",
   *   destinationSignal: "ComponentA.output",
   * }
   */
}

/**
 * Represents a component in a System-on-Chip (SoC) trace system.
 *
 * A trace component is a building block that can be connected to other components
 * to form a trace signal routing network.
 * These components can represent different kind of connections such as simple trigger
 * and event signals to more complex ATB buses.
 *
 * Each component type correspond to a class implementing the SoCTraceComponent interface.
 * Data model for each SoC defines the available components and their interconnections.
 * While CfsTraceManager creates the actual instances of the components.
 */
export interface SoCTraceComponent {
  /**
   * Name of the component. This must be unique within the SoC trace system.
   */
  readonly name: string;

  /**
   * The type of the component. Each component type has a corresponding class implementation
   * that is known to CfsTraceManager.
   */
  readonly type: string;

  /**
   * Retrieves all potential connections for a given input or output signal.
   * When an input signal is passed, it returns all output signals
   * that the input can potentially be routed to.
   * When an output signal is passed, it returns all input signals
   * that can potentially be routed to the input.
   *
   * @param signal - The input signal name to query available connections for
   * @returns A promise that resolves to an array of SoCTraceComponentConnection
   *          elements that signal can be connected to.
   */
  getConnections(signal: string): Promise<SoCTraceComponentConnection[]>;

  /**
   * Establishes a connection between an input and output signal within this component.
   *
   * @param input - The input signal name to connect from
   * @param output - The output signal name to connect to
   * @returns A promise that resolves when the connection is established
   */
  connect(input: string, output: string): Promise<void>;

  /**
   * Removes an existing connection between an input and output signal.
   *
   * @param input - The input signal name of the connection to remove
   * @param output - The output signal name of the connection to remove
   * @returns A promise that resolves when the disconnection is complete
   */
  disconnect(input: string, output: string): Promise<void>;
}
