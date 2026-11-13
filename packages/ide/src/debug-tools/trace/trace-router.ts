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
  isActive?: boolean; // Undefined/omitted in offline mode
  input: string; // Component input
  output: string; // Component output
  inputSignal: string; // Signal connected to component input
  outputSignal: string; // Signal connected to component output
}

export interface TraceRouterOptions {
  onlyActive?: boolean;
  offline?: boolean;
}

type TraceRouterRuntimeOptions = Required<TraceRouterOptions>;

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
 * Most of the logic is implemented in the getRoutesImpl method,
 * with the rest of the methods being simple utilities on top of it.
 */
export class TraceRouter {
  private readonly offlineCache: Record<string, TraceRouteStep[][]> = {};

  constructor(private components: Record<string, SoCTraceComponent>) {}

  private cloneRouteStep(step: TraceRouteStep): TraceRouteStep {
    return {
      component: step.component,
      input: step.input,
      output: step.output,
      inputSignal: step.inputSignal,
      outputSignal: step.outputSignal,
      isActive: step.isActive,
    };
  }

  private cloneRoute(route: TraceRouteStep[]): TraceRouteStep[] {
    return route.map((step) => this.cloneRouteStep(step));
  }

  private cloneRoutes(routes: TraceRouteStep[][]): TraceRouteStep[][] {
    return routes.map((route) => this.cloneRoute(route));
  }

  /**
   * Retrieves an array of all the components of a given type in the system.
   *
   * @param type component type
   * @returns array of components matching the specified type
   */
  public getComponentByType<T extends SoCTraceComponent = SoCTraceComponent>(
    type: string,
  ): T[] {
    return Object.values(this.components).filter((c) => c.type === type) as T[];
  }

  /**
   * Registers a new component in the trace router.
   *
   * @param component The component to register.
   */
  public registerComponent(component: SoCTraceComponent): void {
    this.components[component.name] = component;
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
   * @param options Routing options.
   *
   *                `onlyActive` controls whether yielded routes are filtered to connections that
   *                are currently enabled in hardware. When false, the router also includes
   *                inactive but potentially valid topology edges.
   *
   *                `offline` resolves routes from the static topology only, without reading live
   *                hardware state. In this mode, the returned routes are theoretical or potential
   *                paths allowed by the topology and may not match the routes currently configured
   *                on the device.
   *
   *                The combination `onlyActive`: true and `offline`: true is invalid; all other option combinations are allowed.
   *
   *                If omitted, defaults to an empty object: onlyActive is treated as false and offline is treated as false.
   * @return A generator that yields arrays of TraceRouteStep, each array representing a route.
   */
  public async *getRoutes(
    source: string | undefined,
    sink: string | undefined,
    options: TraceRouterOptions = {},
  ): AsyncGenerator<TraceRouteStep[]> {
    const resolvedOptions: TraceRouterRuntimeOptions = {
      onlyActive: options.onlyActive ?? false,
      offline: options.offline ?? false,
    };

    if (resolvedOptions.onlyActive && resolvedOptions.offline) {
      throw new Error(
        "onlyActive and offline options are mutually exclusive: " +
          "isActive is undefined for all connections in offline mode.",
      );
    }
    if (source === undefined) {
      if (sink === undefined) {
        throw new Error(
          "At least source or sink must be defined to get routes.",
        );
      }
      // getRoutesImpl only routes from a defined source. In order to retrieve
      // All potential origins for a sink we request the opposite route and reverse the result.
      for await (const route of this.getRoutesImpl(
        sink,
        source,
        resolvedOptions,
        [],
      )) {
        yield route
          .slice()
          .reverse()
          .map((step) => ({
            component: step.component,
            isActive: step.isActive,
            input: step.output, // Note this is reversed
            output: step.input, // Note this is reversed
            inputSignal: step.outputSignal, // Note this is reversed
            outputSignal: step.inputSignal, // Note this is reversed
          }));
      }
    } else {
      yield* this.getRoutesImpl(source, sink, resolvedOptions, []);
    }
  }

  /**
   * Core recursive route-discovery algorithm.
   *
   * This method finds all paths from a source signal to a destination signal by:
   * 1. Performing a depth-first search through the component topology
   * 2. Tracking visited steps to prevent cycles
   * 3. In online mode, pre-computing offline routes to optimize connection ordering so shorter routes are computed first
   * 4. Caching offline route results to avoid redundant computation
   *
   * There are multiple reasons for splitting it out of public getRoutes:
   * - Do not expose the previousSteps (used for recursion loop avoidance) parameter to the public interface.
   * - Reduce the problem dimensions by ensuring source is always defined. The case for source being undefined
   *   is handled by calling getRoutesImpl with source and sink swapped and reversing the result on the upper
   *   wrapper, greatly simplifying the route discovery mechanism.
   *
   * @param source The starting signal (e.g., "ComponentA.output")
   * @param destination The target signal, or undefined to find all reachable endpoints
   * @param options Control flags: offline (bypass hardware) and onlyActive (filter by connection state)
   * @param previousSteps Accumulated steps from parent recursion calls (used for cycle detection)
   */
  private async *getRoutesImpl(
    source: string,
    destination: string | undefined,
    options: TraceRouterRuntimeOptions,
    previousSteps: TraceRouteStep[] = [],
  ): AsyncGenerator<TraceRouteStep[]> {
    // === BASE CASE: Destination reached ===
    // If source and destination are the same signal, we've reached the target.
    // Yield the accumulated path and stop traversing this branch.
    if (source === destination) {
      yield previousSteps;
      return;
    }

    // === PARSE SOURCE SIGNAL ===
    // Construct a cache key from source and destination for offline route lookup.
    // This key must be collision-free; source and destination alone define the subproblem.
    const cacheKey = JSON.stringify([source, destination]);
    const [componentName, componentInput] = source.split(/\.(.*)/);
    const component = this.components[componentName];

    // === EARLY EXIT: Component not found ===
    // This is a terminal node (unknown component or end of topology).
    if (component === undefined) {
      if (destination === undefined) {
        // We found an endpoint in an open-ended search; only yield the path
        // when no specific destination was requested.
        yield previousSteps;
      } else {
        // Destination was unreachable from this path; log a warning.
        console.warn(`Unknown trace component: ${componentName}`);
      }
      return;
    }

    if (componentInput === undefined) {
      throw new Error(
        `Invalid source signal format: ${source}. Expected format "component.signal".`,
      );
    }

    // === CACHE HIT: Check offline route cache ===
    // Only read from cache when:
    // - We're in offline mode
    // - The cache has an entry for this (source, destination) key
    // - previousSteps is empty (we're at the recursion root, not in the middle of a deeper path)
    // This guard ensures cache entries are always root-relative and never contain prefix contamination.
    if (
      options.offline &&
      cacheKey in this.offlineCache &&
      previousSteps.length === 0
    ) {
      for (const route of this.cloneRoutes(this.offlineCache[cacheKey])) {
        yield route;
      }
      return;
    }

    // === PHASE 1: OFFLINE ROUTE COMPUTATION ===
    // Collect all possible routes using a static topology model (no hardware queries).
    // These routes are used to derive the "preferred" order of next-hops for online routing.
    const preliminaryRoutes: TraceRouteStep[][] = [];

    // Only compute offline routes in online mode (when options.offline is false/undefined).
    // In pure offline mode, skip this phase to avoid infinite recursion.
    if (options.offline === false) {
      // Recursively find all offline (static) routes from source to destination.
      // Always pass [] as previousSteps so offline results are root-relative and cache-eligible.
      // Once the root-level offline traversal for this (source, destination) subproblem completes,
      // Phase 7 stores it in offlineCache, so repeated lookups amortize to an O(1) cache read.
      for await (const route of this.getRoutesImpl(
        source,
        destination,
        { onlyActive: false, offline: true }, // Force offline mode for this subquery
        [], // Start fresh; don't carry online path context into offline computation
      )) {
        preliminaryRoutes.push(route);
      }
      // Sort by route length (shorter routes first).
      // This heuristic prioritizes direct paths over long chains.
      preliminaryRoutes.sort((a, b) => a.length - b.length);
    }

    // === PHASE 2: DERIVE PREFERRED SIGNAL ORDERING ===
    // Extract the next-hop destination signals from the offline routes (route[0] is the first hop from source).
    // Rank by the actual destination signal, not just the component name, so that distinct signals
    // to the same component maintain separate rankings based on which route they appeared in.
    // Preserve insertion order using Set, which maintains the order of first appearance.
    // This means shorter (better) routes contribute their signals first.
    // Set is ordered in JavaScript, so iteration order reflects discovery order.
    const preferredNextSignals = [
      ...new Set(preliminaryRoutes.map((route) => route[0]?.outputSignal)),
    ].filter((signal): signal is string => signal !== undefined);

    // === PHASE 3: QUERY LIVE CONNECTIONS ===
    // Ask the current component for all signals it can route the input to.
    // In online mode (offline=false/undefined), this performs hardware reads.
    // In offline mode, this returns static topology without hardware I/O.
    const nextConnections = (
      await component.getConnections(componentInput, options.offline)
    ).map((connection) => ({
      ...connection,
      // Precompute the destination signal for sorting
      destSignal: connection.destinationSignal,
    }));

    // === PHASE 4: SORT CONNECTIONS BY PREFERENCE ===
    // Build a rank map for O(1) lookup during sort (avoids O(n²) comparison overhead).
    const preferredRankMap = new Map(
      preferredNextSignals.map((signal, index) => [signal, index]),
    );

    // Sort connections: prefer next-hops that appeared in shorter offline routes.
    // Connections to preferred signals get lower indices (sorted first).
    // Unpreferred signals get MAX_SAFE_INTEGER rank (sorted last).
    nextConnections.sort((a, b) => {
      const aRank =
        preferredRankMap.get(a.destSignal) ?? Number.MAX_SAFE_INTEGER;
      const bRank =
        preferredRankMap.get(b.destSignal) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
    const useCache = options.offline && previousSteps.length === 0;

    // === PHASE 5: HANDLE TERMINAL CASE (no outgoing connections) ===
    if (nextConnections.length === 0) {
      // This is the end of a route (component has no outputs).
      if (useCache) {
        // Cache both reachable endpoints and unreachable dead-ends to avoid
        // recomputing the same offline sub-query.
        this.offlineCache[cacheKey] =
          destination === undefined ? this.cloneRoutes([previousSteps]) : [];
      }

      if (destination === undefined) {
        yield previousSteps;
      }
      return;
    }

    // === PHASE 6: RECURSIVE TRAVERSAL ===
    // For each outgoing connection, recursively explore further paths.
    const newCacheEntry: TraceRouteStep[][] = [];
    for (const connection of nextConnections) {
      const {
        sourceSignal,
        componentSourceSignal,
        componentDestinationSignal,
        destinationSignal,
      } = connection;
      const isActive =
        "isActive" in connection ? connection.isActive : undefined;

      // === FILTER: onlyActive mode ===
      if (!options.offline && isActive === undefined) {
        throw new Error(
          `Online connection ${sourceSignal} -> ${destinationSignal} on ${component.name} is missing isActive.`,
        );
      }

      // Skip inactive (disabled) connections if filtering by active state.
      if (options.onlyActive && isActive === false) {
        continue;
      }

      // === BUILD STEP OBJECT ===
      // Represent this connection as a routing step.
      const step = {
        component,
        isActive,
        input: componentSourceSignal,
        output: componentDestinationSignal,
        inputSignal: sourceSignal,
        outputSignal: destinationSignal,
      };

      // === CHECK: Did we reach the destination exactly? ===
      // If so, yield the complete route and don't continue deeper.
      if (`${component.name}.${componentDestinationSignal}` === destination) {
        const route = previousSteps.concat(step);
        if (useCache) {
          // Snapshot now so caller mutations between next() calls cannot taint cache state.
          newCacheEntry.push(this.cloneRoute(route));
        }
        yield route;
        continue;
      }

      // === CYCLE DETECTION ===
      // Check if we've already visited this outputSignal or component in the current path.
      // Visiting the same component twice indicates a cycle in hardware routing (impossible case).
      // Visiting the same outputSignal twice indicates paths can only merge inside components.
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
        continue; // Skip this connection; it would create a cycle
      }

      // === RECURSE: Explore all paths from the next signal ===
      // Append the current step to the path context so deeper recursion can detect cycles.
      for await (const route of this.getRoutesImpl(
        destinationSignal,
        destination,
        options,
        previousSteps.concat(step), // Carry the accumulated path forward
      )) {
        if (useCache) {
          // Snapshot now so caller mutations between next() calls cannot taint cache state.
          newCacheEntry.push(this.cloneRoute(route));
        }
        yield route;
      }
    }

    // === PHASE 7: CACHE WRITE (offline mode, root level only) ===
    // After the entire DFS completes, store all discovered routes under this (source, destination) key.
    // The previousSteps.length === 0 guard ensures we only write root-relative, uncontaminated routes.
    // This allows subsequent queries from this source to reuse the computed topology.
    if (useCache) {
      this.offlineCache[cacheKey] = this.cloneRoutes(newCacheEntry);
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
    const route = (
      await this.getRoutes(source, sink, { onlyActive: false }).next()
    ).value;
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
    for await (const route of this.getRoutes(source, sink, {
      onlyActive: true,
    })) {
      for (const step of route) {
        await step.component.disconnect(step.input, step.output);
        // Check if other inputs are still actively routed to this output (fan-in).
        // getConnections on an output signal returns upstream connections.
        const activeConnectionsUpstream = (
          await step.component.getConnections(step.output)
        ).filter((c) => c.isActive);

        if (activeConnectionsUpstream.length > 0) {
          // There are other inputs still using this output; do not continue the disconnection
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
      (await this.getRoutes(source, sink, { onlyActive: true }).next())
        .value !== undefined
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
      (await this.getRoutes(source, sink, { onlyActive: false }).next())
        .value !== undefined
    );
  }
}
