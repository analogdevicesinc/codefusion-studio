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

import { SoCTraceComponent } from "./trace-types";

export interface TraceRouteStep {
  component: SoCTraceComponent;
  isActive: boolean;
  input: string; // Component input
  output: string; // Component output
  inputSignal: string; // Signal connected to component input
  outputSignal: string; // Signal connected to component output
}

/**
 * This class implements all the routing logic for trace components.
 *
 * On construction it receives a record with all the different SoCTraceComponent
 * instances of the system and exposes methods to retrieve information about
 * how those components are interconnected.
 *
 * This class is not aware of any component type specific information, it treats
 * all components as generic classes implementing the SoCTraceComponent interface.
 *
 * Most of the logic is implemented in the getRoutes method,
 * with the rest of the methods being simple utilities on top of it.
 */
export class TraceRouter {
  constructor(private components: Record<string, SoCTraceComponent>) {}

  /**
   * Retrieves an array of all the components of a given type in the system.
   *
   * @param type component type
   * @returns array of components matching the specified type
   */
  public getComponentByType(type: string): SoCTraceComponent[] {
    return Object.values(this.components).filter((c) => c.type === type);
  }

  /**
   * Returns a generator that yields all possible routes between two components,
   * all the routes that lead to one component, or all the routes that originate from one component.
   *
   * The routes (represented as an array of TraceRouteStep) can include all potential connections,
   * even if they are not currently active, or only the ones that are currently enabled,
   * depending on the value of the onlyActive parameter.
   *
   * This can be useful to determine:
   * - Whether two components are currently connected
   * - Whether two components can be connected by enabling some currently disabled connections
   * - All the components that are currently feeding into a component of interest
   * - All the components that a component of interest can potentially feed into
   *
   * If only one route between two components is needed, the generator can be used to retrieve
   * only the first route and save the computation needed for other potential routes.
   *
   *
   * Important note!!
   * Currently getConnections returns connections downstream or upstream depending on
   * the queried signal (e.g. if the signal is an input of the component, getConnections returns downstream connections,
   * if the signal is an output of the component, getConnections returns upstream connections).
   *
   * This leads to "interesting" behavior such as getRoutes(undefined, "ComponentA.input") returning all
   * downstream routes from ComponentA.input while getRoutes(undefined, "ComponentA.output") will return all
   * upstream routes to ComponentA.output.
   *
   * This is not intuitive and we probably need to be more explicit about requesting upstream or downstream
   * connections, but that requires extra logic on each component. For the moment, make sure that when
   * source is set to undefined, sink is set to an output signal.
   *
   * @param source source component signal in the form "component.signal".
   *               If undefined, all routes that lead to the sink will be retrieved
   *               (sink cannot be undefined in this case).
   * @param sink destination component signal in the form "component.signal".
   *             If undefined, all routes that originate from the source will be retrieved
   *             (source cannot be undefined in this case).
   * @param onlyActive If true, only routes with currently active connections will be yielded.
   *                   If false, all potential routes (enabled and not enabled) will be yielded.
   * @return A generator that yields arrays of TraceRouteStep, each array representing a route.
   */
  public async *getRoutes(
    source: string | undefined,
    sink: string | undefined,
    onlyActive: boolean = false,
  ): AsyncGenerator<TraceRouteStep[]> {
    if (source === undefined) {
      if (sink === undefined) {
        throw new Error(
          "At least source or sink must be defined to get routes.",
        );
      }
      // getRoutesImpl only routes from a defined source. In order to retrieve
      // All potential origins for a sink we request the opposite route and reverse the result.
      for await (const route of this.getRoutesImpl(sink, source, onlyActive)) {
        yield route.reverse().map((step) => ({
          component: step.component,
          isActive: step.isActive,
          input: step.output, // Note this is reversed
          output: step.input, // Note this is reversed
          inputSignal: step.outputSignal, // Note this is reversed
          outputSignal: step.inputSignal, // Note this is reversed
        }));
      }
    } else {
      yield* this.getRoutesImpl(source, sink, onlyActive);
    }
  }

  /**
   * Helper method to extract the component name from a signal in the form "component.signal".
   * @param signal signal in the form "component.signal"
   * @returns the component name or undefined if the signal is not in the correct format or is undefined
   */

  private getComponentNameFromSignal(
    signal: string | undefined,
  ): string | undefined {
    if (signal === undefined) {
      return undefined;
    }
    const separatorIndex = signal.indexOf(".");
    return separatorIndex <= 0 ? undefined : signal.slice(0, separatorIndex);
  }

  /**
   * This private method is the one actually implementing the routing logic.
   *
   * There are multiple reasons for splitting it out of public getRoutes:
   * - Do not expose the previousSteps (used for recursion loop avoidance) parameter to the public interface.
   * - Reduce the problem dimensions by ensuring source is always defined. The case for source being undefined
   *   is handled by calling getRoutesImpl with source and sink swapped and reversing the result on the upper
   *   wrapper, greatly simplifying the route discovery mechanism.
   */
  private async *getRoutesImpl(
    source: string,
    destination: string | undefined,
    onlyActive: boolean,
    previousSteps: TraceRouteStep[] = [],
  ): AsyncGenerator<TraceRouteStep[]> {
    if (source === destination) {
      // Route found, yield previous steps
      yield previousSteps;
      // Do not continue this path
      return;
    }

    const [componentName, componentInput] = source.split(/\.(.*)/);
    const component = this.components[componentName];

    if (component === undefined) {
      // This is the end of a route
      if (destination === undefined) {
        // Yield steps up to here if we are not looking for a specific destination
        yield previousSteps;
      } else {
        console.warn(`Unknown trace component: ${componentName}`);
      }
      return;
    }

    if (componentInput === undefined) {
      console.warn(
        `Invalid source signal format: ${source}. Expected format "component.signal".`,
      );
      return;
    }

    const nextConnections = (
      await component.getConnections(componentInput)
    ).map((connection) => ({
      ...connection,
      destComponent: this.getComponentNameFromSignal(
        connection.destinationSignal,
      ),
    }));
    // Sort connections so that the ones containing the destination component are evaluated first.
    const destinationComponent = this.getComponentNameFromSignal(destination);
    if (destinationComponent !== undefined) {
      nextConnections.sort((a, b) => {
        const aContainsDestination =
          a.destComponent === destinationComponent ? 1 : 0;
        const bContainsDestination =
          b.destComponent === destinationComponent ? 1 : 0;
        return bContainsDestination - aContainsDestination;
      });
    }

    // Note this will yield shorter routes first, if for whatever reason longer routes first are preferred,
    // A check for length > 0 with the for loop inside should be used with the content of the following if
    // block being on the else branch.
    if (nextConnections.length === 0) {
      // This is the end of a route
      if (destination === undefined) {
        // Yield steps up to here if we are not looking for a specific destination
        yield previousSteps;
      }
      return;
    }

    for (const {
      sourceSignal,
      componentSourceSignal,
      componentDestinationSignal,
      destinationSignal,
      isActive,
    } of nextConnections) {
      if (onlyActive && !isActive) {
        continue;
      }
      const step = {
        component,
        isActive,
        input: componentSourceSignal,
        output: componentDestinationSignal,
        inputSignal: sourceSignal,
        outputSignal: destinationSignal,
      };

      if (`${component.name}.${componentDestinationSignal}` === destination) {
        // The route was delimited by an output signal yield
        // and do not continue this path
        yield previousSteps.concat(step);
        continue;
      }

      // Detect cycles by checking if we've already visited this output signal or component.
      //
      // We check outputSignal because paths can only merge inside a component, so the first
      // merge point appears at an output signal. However, this alone is insufficient for
      // fully-connected components (like TRUs) where all inputs route to all outputs. Without
      // checking the component itself, the router alternates between different inputs/outputs
      // of the same component, creating unnecessarily long daisy-chain paths.
      //
      // Checking s.component.name === step.component.name catches revisiting the same component via
      // any signal, which is always a cycle in hardware routing—legitimate routes never
      // need to pass through the same component twice.
      //
      // Note that the find operation is O(n) on the number of previous steps, we could make use
      // of a Set but those compare object references and not values, so we would need to
      // do some stringification or something similar. Since the number of steps is limited by hardware
      // we can expect it to be below 10 in most cases, so we won't worry about the O(n) for now.
      // If you reached this comment because of performance issues, feel free to optimize it.
      if (
        previousSteps.find(
          (s) =>
            s.outputSignal === step.outputSignal ||
            s.component.name === step.component.name,
        )
      ) {
        continue;
      }

      yield* this.getRoutesImpl(
        destinationSignal,
        destination,
        onlyActive,
        previousSteps.concat(step),
      );
    }
  }

  /**
   * Connects two signals by enabling all the connections along the route between them.
   * If multiple routes are available, only the first one will be used.
   *
   * @param source source component signal in the form "component.signal".
   * @param sink destination component signal in the form "component.signal".
   */
  public async connectSignals(source: string, sink: string): Promise<void> {
    const route = (await this.getRoutes(source, sink, false).next()).value;
    if (route === undefined) {
      throw new Error(`No route found between ${source} and ${sink}.`);
    }

    for (const step of route) {
      await step.component.connect(step.input, step.output);
    }
  }

  /**
   * Disconnects two signals.
   * If multiple routes are established, all of them will be disconnected.
   * If portions of the route are shared with other routes, only the non-shared connections
   * will be disabled to avoid affecting other routes.
   *
   * @param source source component signal in the form "component.signal".
   * @param sink destination component signal in the form "component.signal".
   */
  public async disconnectSignals(source: string, sink: string): Promise<void> {
    for await (const route of this.getRoutes(source, sink, true)) {
      for (const step of route) {
        await step.component.disconnect(step.input, step.output);
        // Check if this component is merging multiple paths into the output
        const activeConnectionsUpstream = (
          await step.component.getConnections(step.output)
        ).filter((c) => c.isActive);

        if (activeConnectionsUpstream.length > 0) {
          // There are other inputs using the output, do not continue the disconnection
          break;
        }
      }
    }
  }

  /**
   * Return whether two signals are currently connected by at least one route of active connections.
   *
   * @param source source component signal in the form "component.signal".
   * @param sink destination component signal in the form "component.signal".
   * @returns true if there is at least one active route connecting the signals, false otherwise.
   */
  public async areSignalsConnected(
    source: string,
    sink: string,
  ): Promise<boolean> {
    return (
      (await this.getRoutes(source, sink, true).next()).value !== undefined
    );
  }

  /**
   * Return whether two signals can be connected by at least one route of connections.
   *
   * @param source source component signal in the form "component.signal".
   * @param sink destination component signal in the form "component.signal".
   * @returns true if there is at least one potential route to connect the signals, false otherwise.
   */
  public async canSignalsBeConnected(
    source: string,
    sink: string,
  ): Promise<boolean> {
    // Compute only the first route, no need to compute all of them.
    return (
      (await this.getRoutes(source, sink, false).next()).value !== undefined
    );
  }
}
