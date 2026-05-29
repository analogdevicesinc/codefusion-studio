import { describe, it } from "mocha";
import { expect } from "chai";
import type {
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../../debug-tools/system-event-viewer/hardware/trace-types";
import { TraceRouter } from "../../debug-tools/system-event-viewer/hardware/trace-router";

class MockTraceSwitch implements SoCTraceComponent {
  type: string;
  name: string;
  connections: Record<string, SoCTraceComponentConnection[]>;

  // Keeping track of forward connections only.
  // Reverse connections are generated on the fly when required.
  constructor(
    name: string,
    forwardConnections: Record<string, SoCTraceComponentConnection[]>,
  ) {
    this.name = name;
    this.type = "mock-trace-switch";
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

  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    const allConnections = this.generateReverseConnections();
    const output = allConnections[signal];
    if (!output) {
      throw new Error(`Signal ${signal} not found in component ${this.name}`);
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

describe("TraceRouter", () => {
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
        router.getRoutes(undefined, "component2.output", true),
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
});
