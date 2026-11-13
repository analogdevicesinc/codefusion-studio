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

import { describe, it } from "mocha";
import { expect } from "chai";
import type {
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../../debug-tools/trace/trace-types";
import { TraceRouter } from "../../debug-tools/trace/trace-router";

class MockTraceSwitch implements SoCTraceComponent {
  type: string;
  name: string;
  connections: Record<string, SoCTraceComponentConnection[]>;
  offlineOnly: boolean;
  getConnectionsCallCount: number;

  // Keeping track of forward connections only.
  // Reverse connections are generated on the fly when required.
  constructor(
    name: string,
    forwardConnections: Record<string, SoCTraceComponentConnection[]>,
    options: { offlineOnly?: boolean } = {},
  ) {
    this.name = name;
    this.type = "mock-trace-switch";
    this.offlineOnly = options.offlineOnly ?? false;
    this.getConnectionsCallCount = 0;
    // Build both forward and reverse connections
    this.connections = { ...forwardConnections };
    // For each input signal, auto-generate reverse connections for the output signal
  }

  private generateReverseConnections(): Record<
    string,
    SoCTraceComponentConnection[]
  > {
    const reverseConnections: Record<string, SoCTraceComponentConnection[]> =
      {};
    for (const [input, conns] of Object.entries(this.connections)) {
      for (const conn of conns) {
        const output = conn.componentDestinationSignal;
        if (!reverseConnections[output]) {
          reverseConnections[output] = [];
        }
        // Add reverse connection if not already present
        reverseConnections[output].push({
          sourceSignal: conn.destinationSignal,
          componentSourceSignal: output,
          componentDestinationSignal: input,
          destinationSignal: conn.sourceSignal,
          isActive: conn.isActive,
        });
      }
    }
    return { ...this.connections, ...reverseConnections };
  }
  async getConnections(
    signal: string,
    offline?: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    this.getConnectionsCallCount += 1;

    if (this.offlineOnly && offline !== true) {
      throw new Error(
        `Component ${this.name} is configured for offline-only access`,
      );
    }

    const allConnections = this.generateReverseConnections();
    const output = allConnections[signal];
    if (!output) {
      throw new Error(`Signal ${signal} not found in component ${this.name}`);
    }

    // In offline mode, return connections with isActive set to undefined
    if (offline === true) {
      return output.map((conn) => ({
        ...conn,
        isActive: undefined,
      }));
    }

    return output;
  }

  async connect(input: string, output: string): Promise<void> {
    const inputconnections = this.connections[input];
    if (!inputconnections) {
      throw new Error(`Input ${input} not found in component ${this.name}`);
    }
    const inputConnection = inputconnections.find(
      (c) => c.componentDestinationSignal === output,
    );

    if (!inputConnection) {
      throw new Error(`Output ${output} not found in component ${this.name}`);
    }
    inputConnection.isActive = true;
  }

  async disconnect(input: string, output: string): Promise<void> {
    const inputconnections = this.connections[input];
    if (!inputconnections) {
      throw new Error(`Input ${input} not found in component ${this.name}`);
    }
    const connection = inputconnections.find(
      (c) => c.componentDestinationSignal === output,
    );

    if (!connection) {
      throw new Error(`Output ${output} not found in component ${this.name}`);
    }
    connection.isActive = false;
  }
}

async function arrayFromAsyncIterable<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

function getTotalTopologyReadCount(components: MockTraceSwitch[]): number {
  return components.reduce(
    (total, component) => total + component.getConnectionsCallCount,
    0,
  );
}

describe("TraceRouter", () => {
  describe("Component registration", () => {
    it("returns a component registered after construction", () => {
      const router = new TraceRouter({});
      const component = new MockTraceSwitch("registered-component", {});

      router.registerComponent(component);

      expect(router.getComponentByType("mock-trace-switch")).to.deep.equal([
        component,
      ]);
    });
  });

  describe("Linear network", () => {
    /**
     * initialInput -> component1 -> component2 -> component3 -> finalOutput
     */

    const components: SoCTraceComponent[] = [
      new MockTraceSwitch("component1", {
        input: [
          {
            sourceSignal: "initialInput",
            componentSourceSignal: "input",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input",
            isActive: false,
          },
        ],
      }),
      new MockTraceSwitch("component2", {
        input: [
          {
            sourceSignal: "component1.output",
            componentSourceSignal: "input",
            componentDestinationSignal: "output",
            destinationSignal: "component3.input",
            isActive: false,
          },
        ],
      }),
      new MockTraceSwitch("component3", {
        input: [
          {
            sourceSignal: "component2.output",
            componentSourceSignal: "input",
            componentDestinationSignal: "output",
            destinationSignal: "finalOutput",
            isActive: false,
          },
        ],
      }),
    ];

    const router = new TraceRouter(
      Object.fromEntries(components.map((c) => [c.name, c])),
    );

    it("Must return explicit full path", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: components[2],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return (implicit) full path when destination is undefined", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", undefined),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: components[2],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return (implicit) full path when source is undefined", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes(undefined, "component3.output"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: components[2],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return explicit initial partial path defined by component output", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "component2.output"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
        ],
      ]);
    });

    it("Must return explicit initial partial path defined by component input", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "component3.input"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
        ],
      ]);
    });

    it("Must return (implicit) initial partial path when source is undefined", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes(undefined, "component2.output"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
        ],
      ]);
    });

    it("Must return explicit final partial path", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component2.input", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: components[2],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return (implicit) final partial path when destination is undefined", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component2.input", undefined),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: components[2],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });
  });

  describe("Funnel network", () => {
    /**
     * = denotes an active connection,
     * - denotes an inactive connection.
     *
     * initialInput1_1 =|
     *                  |-> component1_1 =|
     * initialInput1_2 -|                 |
     *                                    |=>component2 => finalOutput
     * initialInput2_1 =|                 |
     *                  |=> component1_2 -|     <--- Note component2.input2 is not active
     * initialInput2_2 -|
     */

    const components: SoCTraceComponent[] = [
      new MockTraceSwitch("component1_1", {
        input1: [
          {
            sourceSignal: "initialInput1_1",
            componentSourceSignal: "input1",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input1",
            isActive: true,
          },
        ],
        input2: [
          {
            sourceSignal: "initialInput1_2",
            componentSourceSignal: "input2",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input1",
            isActive: false,
          },
        ],
      }),

      new MockTraceSwitch("component1_2", {
        input1: [
          {
            sourceSignal: "initialInput2_1",
            componentSourceSignal: "input1",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input2",
            isActive: true,
          },
        ],
        input2: [
          {
            sourceSignal: "initialInput2_2",
            componentSourceSignal: "input2",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input2",
            isActive: false,
          },
        ],
      }),

      new MockTraceSwitch("component2", {
        input1: [
          {
            sourceSignal: "component1_1.output",
            componentSourceSignal: "input1",
            componentDestinationSignal: "output",
            destinationSignal: "finalOutput",
            isActive: true,
          },
        ],
        input2: [
          {
            sourceSignal: "component1_2.output",
            componentSourceSignal: "input2",
            componentDestinationSignal: "output",
            destinationSignal: "finalOutput",
            isActive: false,
          },
        ],
      }),
    ];

    const router = new TraceRouter(
      Object.fromEntries(components.map((c) => [c.name, c])),
    );

    it("Must return explicit full path from input 1.1", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1_1.input1", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "initialInput1_1",
            outputSignal: "component2.input1",
          },
          {
            component: components[2],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "component1_1.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return explicit full path from input 1.2", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1_1.input2", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "initialInput1_2",
            outputSignal: "component2.input1",
          },
          {
            component: components[2],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "component1_1.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return explicit full path from input 2.1", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1_2.input1", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[1],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "initialInput2_1",
            outputSignal: "component2.input2",
          },
          {
            component: components[2],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "component1_2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return explicit full path from input 2.2", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1_2.input2", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[1],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "initialInput2_2",
            outputSignal: "component2.input2",
          },
          {
            component: components[2],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "component1_2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return all paths to final output if source is undefined", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes(undefined, "component2.output"),
      );
      expect(path).to.have.deep.members([
        [
          {
            component: components[0],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "initialInput1_1",
            outputSignal: "component2.input1",
          },
          {
            component: components[2],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "component1_1.output",
            outputSignal: "finalOutput",
          },
        ],
        [
          {
            component: components[0],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "initialInput1_2",
            outputSignal: "component2.input1",
          },
          {
            component: components[2],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "component1_1.output",
            outputSignal: "finalOutput",
          },
        ],
        [
          {
            component: components[1],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "initialInput2_1",
            outputSignal: "component2.input2",
          },
          {
            component: components[2],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "component1_2.output",
            outputSignal: "finalOutput",
          },
        ],
        [
          {
            component: components[1],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "initialInput2_2",
            outputSignal: "component2.input2",
          },
          {
            component: components[2],
            isActive: false,
            input: "input2",
            output: "output",
            inputSignal: "component1_2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must return only active paths if requested", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes(undefined, "component2.output", { onlyActive: true }),
      );
      expect(path).to.have.deep.members([
        [
          {
            component: components[0],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "initialInput1_1",
            outputSignal: "component2.input1",
          },
          {
            component: components[2],
            isActive: true,
            input: "input1",
            output: "output",
            inputSignal: "component1_1.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });
  });

  describe("Feedback network", () => {
    /**
     * Feedback loop to test loop avoidance.
     *
     *  initialInput ->|------------|  |------------|  |------------|-> finalOutput
     *                 | component1 |->| component2 |->| component3 |
     *              |->|------------|  |------------|  |------------|-|
     *              |                                                 |
     *              |-------------------------------------------------|
     */

    // Setting timeout since these tests may fail due to endless loop.
    beforeEach(function () {
      this.timeout(1000);
    });

    const components: SoCTraceComponent[] = [
      new MockTraceSwitch("component1", {
        input1: [
          {
            sourceSignal: "initialInput",
            componentSourceSignal: "input1",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input",
            isActive: false,
          },
        ],
        input2: [
          {
            sourceSignal: "component3.output2",
            componentSourceSignal: "input2",
            componentDestinationSignal: "output",
            destinationSignal: "component2.input",
            isActive: false,
          },
        ],
      }),

      new MockTraceSwitch("component2", {
        input: [
          {
            sourceSignal: "component1.output",
            componentSourceSignal: "input",
            componentDestinationSignal: "output",
            destinationSignal: "component3.input",
            isActive: false,
          },
        ],
      }),

      new MockTraceSwitch("component3", {
        input: [
          {
            sourceSignal: "component2.output",
            componentSourceSignal: "input",
            componentDestinationSignal: "output1",
            destinationSignal: "finalOutput",
            isActive: false,
          },
          {
            sourceSignal: "component2.output",
            componentSourceSignal: "input",
            componentDestinationSignal: "output2",
            destinationSignal: "component1.input2",
            isActive: false,
          },
        ],
      }),
    ];

    const router = new TraceRouter(
      Object.fromEntries(components.map((c) => [c.name, c])),
    );

    it("Must return a single path that does not include loops", async () => {
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1.input1", "finalOutput"),
      );
      expect(path).to.deep.equal([
        [
          {
            component: components[0],
            isActive: false,
            input: "input1",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: components[1],
            isActive: false,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: components[2],
            isActive: false,
            input: "input",
            output: "output1",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });
  });

  describe("Offline routing mode", () => {
    /**
     * Simple 3-component linear network to test offline mode behavior:
     * component1.input -> component1.output -> component2.input -> component2.output -> component3.input -> component3.output
     *
     * Use a factory so each test can start from a fresh TraceRouter instance.
     * TraceRouter now has an internal offline route cache, so sharing one router
     * across all tests would leak cached state between unrelated assertions.
     *
     * Some tests in this block intentionally reuse the same router within a
     * single test (for repeated queries) to validate cache behavior.
     */
    const createOfflineModeRouter = (): {
      components: MockTraceSwitch[];
      router: TraceRouter;
    } => {
      const components: MockTraceSwitch[] = [
        new MockTraceSwitch(
          "component1",
          {
            input: [
              {
                sourceSignal: "initialInput",
                componentSourceSignal: "input",
                componentDestinationSignal: "output",
                destinationSignal: "component2.input",
                isActive: true,
              },
            ],
          },
          { offlineOnly: true },
        ),
        new MockTraceSwitch(
          "component2",
          {
            input: [
              {
                sourceSignal: "component1.output",
                componentSourceSignal: "input",
                componentDestinationSignal: "output",
                destinationSignal: "component3.input",
                isActive: false,
              },
            ],
          },
          { offlineOnly: true },
        ),
        new MockTraceSwitch(
          "component3",
          {
            input: [
              {
                sourceSignal: "component2.output",
                componentSourceSignal: "input",
                componentDestinationSignal: "output",
                destinationSignal: "finalOutput",
                isActive: true,
              },
            ],
          },
          { offlineOnly: true },
        ),
      ];

      const router = new TraceRouter(
        Object.fromEntries(components.map((c) => [c.name, c])),
      );

      return { components, router };
    };

    it("Must set isActive to undefined for all steps in offline mode", async () => {
      const { router } = createOfflineModeRouter();
      const path = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );
      expect(path).to.have.lengthOf(1);
      for (const step of path[0]) {
        expect(step.isActive).to.be.undefined;
      }
    });

    it("Must support offline-only components in offline mode", async () => {
      const { router } = createOfflineModeRouter();
      await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );
    });

    it("Must throw for offline-only components in online mode", async () => {
      const { router } = createOfflineModeRouter();

      try {
        await router.getRoutes("component1.input", "finalOutput").next();
        expect.fail("Expected an error to be thrown");
      } catch (error) {
        expect((error as Error).message).to.include("offline-only");
      }
    });

    it("Must throw error when combining onlyActive and offline options", async () => {
      const { router } = createOfflineModeRouter();
      try {
        // Attempt to iterate the first route (which will trigger the error in getRoutes)
        await router
          .getRoutes("component1.input", "finalOutput", {
            onlyActive: true,
            offline: true,
          })
          .next();
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect((error as Error).message).to.include("onlyActive and offline");
        expect((error as Error).message).to.include("mutually exclusive");
      }
    });

    it("Must return consistent paths in offline mode on repeated queries (caching works)", async () => {
      const { components, router } = createOfflineModeRouter();
      const baselineReads = getTotalTopologyReadCount(components);

      const path1 = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );
      const readsAfterFirstQuery = getTotalTopologyReadCount(components);

      const path2 = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );
      const readsAfterSecondQuery = getTotalTopologyReadCount(components);

      expect(path1).to.deep.equal(path2);
      expect(readsAfterFirstQuery - baselineReads).to.be.greaterThan(0);
      expect(readsAfterSecondQuery - readsAfterFirstQuery).to.equal(0);
    });

    it("Must match reused-instance and fresh-instance offline results", async () => {
      const { router: reusedRouter } = createOfflineModeRouter();

      const reusedPath1 = await arrayFromAsyncIterable(
        reusedRouter.getRoutes("component1.input", "finalOutput", {
          offline: true,
        }),
      );
      const reusedPath2 = await arrayFromAsyncIterable(
        reusedRouter.getRoutes("component1.input", "finalOutput", {
          offline: true,
        }),
      );

      const { router: freshRouter } = createOfflineModeRouter();
      const freshPath = await arrayFromAsyncIterable(
        freshRouter.getRoutes("component1.input", "finalOutput", {
          offline: true,
        }),
      );

      expect(reusedPath1).to.deep.equal(reusedPath2);
      expect(reusedPath2).to.deep.equal(freshPath);
    });

    it("Must isolate cached offline routes from caller mutations", async () => {
      const { router } = createOfflineModeRouter();
      const firstPath = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );

      firstPath[0][0].input = "mutated-input";
      firstPath[0][0].outputSignal = "mutated-output";
      firstPath[0].push({
        component: firstPath[0][0].component,
        input: "extra-input",
        output: "extra-output",
        inputSignal: "extra-source",
        outputSignal: "extra-destination",
      });

      const secondPath = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );

      expect(secondPath).to.deep.equal([
        [
          {
            component: secondPath[0][0].component,
            isActive: undefined,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: secondPath[0][1].component,
            isActive: undefined,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: secondPath[0][2].component,
            isActive: undefined,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ]);
    });

    it("Must keep both reused and fresh routers pristine after caller mutation", async () => {
      const { router: reusedRouter } = createOfflineModeRouter();
      const reusedFirstPath = await arrayFromAsyncIterable(
        reusedRouter.getRoutes("component1.input", "finalOutput", {
          offline: true,
        }),
      );

      reusedFirstPath[0][0].input = "mutated-input";
      reusedFirstPath[0][1].outputSignal = "mutated-output";

      const reusedSecondPath = await arrayFromAsyncIterable(
        reusedRouter.getRoutes("component1.input", "finalOutput", {
          offline: true,
        }),
      );

      const { router: freshRouter } = createOfflineModeRouter();
      const freshPath = await arrayFromAsyncIterable(
        freshRouter.getRoutes("component1.input", "finalOutput", {
          offline: true,
        }),
      );

      const expectedPristinePath = [
        [
          {
            component: reusedSecondPath[0][0].component,
            isActive: undefined,
            input: "input",
            output: "output",
            inputSignal: "initialInput",
            outputSignal: "component2.input",
          },
          {
            component: reusedSecondPath[0][1].component,
            isActive: undefined,
            input: "input",
            output: "output",
            inputSignal: "component1.output",
            outputSignal: "component3.input",
          },
          {
            component: reusedSecondPath[0][2].component,
            isActive: undefined,
            input: "input",
            output: "output",
            inputSignal: "component2.output",
            outputSignal: "finalOutput",
          },
        ],
      ];

      expect(reusedSecondPath).to.deep.equal(expectedPristinePath);
      expect(freshPath).to.deep.equal(expectedPristinePath);
    });

    it("Must not leak caller mutations into cache between iterator next calls", async () => {
      const { router } = createOfflineModeRouter();

      const iterator = router.getRoutes("component1.input", "finalOutput", {
        offline: true,
      });

      const firstResult = await iterator.next();
      expect(firstResult.done).to.be.false;

      const firstRoute = firstResult.value;
      firstRoute[0].input = "mutated-before-complete";
      firstRoute[0].outputSignal = "mutated-before-complete";

      const completionResult = await iterator.next();
      expect(completionResult.done).to.be.true;

      const cachedPath = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );

      expect(cachedPath[0][0].input).to.equal("input");
      expect(cachedPath[0][0].outputSignal).to.equal("component2.input");
    });

    it("Must cache unreachable offline queries to avoid recomputation", async () => {
      const deadEnd = new MockTraceSwitch("deadEnd", {
        input: [],
      });

      const router = new TraceRouter({ deadEnd });
      const baselineReads = deadEnd.getConnectionsCallCount;

      const first = await arrayFromAsyncIterable(
        router.getRoutes("deadEnd.input", "componentX.output", {
          offline: true,
        }),
      );
      const readsAfterFirstQuery = deadEnd.getConnectionsCallCount;

      const second = await arrayFromAsyncIterable(
        router.getRoutes("deadEnd.input", "componentX.output", {
          offline: true,
        }),
      );
      const readsAfterSecondQuery = deadEnd.getConnectionsCallCount;

      expect(first).to.be.an("array").that.is.empty;
      expect(second).to.be.an("array").that.is.empty;
      expect(readsAfterFirstQuery - baselineReads).to.be.greaterThan(0);
      expect(readsAfterSecondQuery - readsAfterFirstQuery).to.equal(0);
    });
  });

  describe("Offline routing with ordering heuristic", () => {
    /**
     * Network with multiple paths to test preference ordering:
     *
     * component1.input -> component1.output -|-> (short path) component3.input -> finalOutput
     *                                         |
     *                                         |-> (long path) component2.input -> component2.output -> component3.input -> finalOutput
     *
     * In offline mode, traversal follows component connection order, so this
     * suite validates route discovery and keeps strict ordering assertions for
     * online mode where offline-derived preference is applied.
     */
    const createOrderingRouter = (): TraceRouter => {
      const components: SoCTraceComponent[] = [
        new MockTraceSwitch("component1", {
          input: [
            {
              sourceSignal: "initialInput",
              componentSourceSignal: "input",
              componentDestinationSignal: "output",
              destinationSignal: "component2.input",
              isActive: false,
            },
            {
              sourceSignal: "initialInput",
              componentSourceSignal: "input",
              componentDestinationSignal: "output",
              destinationSignal: "component3.input",
              isActive: false,
            },
          ],
        }),
        new MockTraceSwitch("component2", {
          input: [
            {
              sourceSignal: "component1.output",
              componentSourceSignal: "input",
              componentDestinationSignal: "output",
              destinationSignal: "component3.input",
              isActive: false,
            },
          ],
        }),
        new MockTraceSwitch("component3", {
          input: [
            {
              sourceSignal: "component1.output",
              componentSourceSignal: "input",
              componentDestinationSignal: "output",
              destinationSignal: "finalOutput",
              isActive: false,
            },
            {
              sourceSignal: "component2.output",
              componentSourceSignal: "input",
              componentDestinationSignal: "output",
              destinationSignal: "finalOutput",
              isActive: false,
            },
          ],
        }),
      ];

      return new TraceRouter(
        Object.fromEntries(components.map((c) => [c.name, c])),
      );
    };

    it("Must discover both shorter and longer paths when multiple paths exist", async () => {
      const router = createOrderingRouter();
      const paths = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: true }),
      );

      expect(paths.length).to.be.greaterThan(1);
      const routeLengths = paths.map((route) => route.length);
      // In offline mode, traversal order follows the component's connection order.
      // Validate that the router discovers both shorter and longer alternatives.
      expect(routeLengths).to.include(2);
      expect(routeLengths.some((length) => length > 2)).to.be.true;
    });

    it("Must respect offline preference ordering in online mode", async () => {
      const router = createOrderingRouter();
      const paths = await arrayFromAsyncIterable(
        router.getRoutes("component1.input", "finalOutput", { offline: false }),
      );

      expect(paths.length).to.be.greaterThan(0);
      // In online mode, paths are sorted by the offline heuristic
      // So the shorter offline path's next-hop (component3) should be preferred
      // This means the direct path (component1 -> component3) appears first
      const firstPathSteps = paths[0];
      expect(firstPathSteps[0].component.name).to.equal("component1");
      expect(firstPathSteps[1].component.name).to.equal("component3");
    });
  });
});
