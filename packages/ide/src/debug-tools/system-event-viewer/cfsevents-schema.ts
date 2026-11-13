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

const CfsEventsStates = ["active", "running", "ended", "file"] as const;
export type CfsEventState = (typeof CfsEventsStates)[number];

export namespace v0_2 {
  export const cfsEventsSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "CFS Event File Schema",
    description: "Schema for CodeFusion Studio system event viewer files",
    type: "object",
    properties: {
      schemaVersion: {
        description:
          "Version of the json schema. This schema is only compatible with version 0.2",
        type: "string",
        pattern: "^0\\.2$",
      },
      lastUpdate: {
        description:
          "Timestamp of the last update of the events of this file, in ISO8601 format (e.g. 1992-03-23T12:34:56+00:00). Note that properties such as state may be updated without changing this timestamp.",
        type: "string",
        format: "date-time",
      },
      tickFrequency: {
        description:
          "Frequency of the timestamp generation clock, in Hz (ticks per second)",
        type: "number",
      },
      ticksEpoch: {
        description:
          "Timestamp of the first tick (tick 0) of timestamp generator clock, in ISO8601 format (e.g. 1992-03-23T12:34:56+00:00).",
        type: "string",
        format: "date-time",
      },
      events: {
        description:
          "Object containing all the recorded events. Each property name defines an event source and its value all the information related to it.",
        type: "object",
        additionalProperties: { $ref: "#/$defs/event" },
      },
      state: {
        description:
          "Current state of the System Event Viewer session. This information is only used on a live session through custom content provider. Files can omit this property, on which case 'file' is assumed.",
        type: "string",
        default: "file",
        enum: CfsEventsStates,
      },
    },
    required: ["schemaVersion", "events", "lastUpdate"],
    $defs: {
      event: {
        description:
          "Information regarding an event source. For the moment only contains the timestamps of each event occurrence.",
        type: "object",
        properties: {
          timestamps: {
            description:
              "Array of timestamps of the event occurrences, in clock ticks of 'tickFrequency' frequency since 'ticksEpoch'.",
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
        required: ["timestamps"],
      },
    },
  } as const;

  export interface CfsEventEntry {
    timestamps: number[];
  }

  export interface CfsEventsFile {
    schemaVersion: "0.2";
    lastUpdate: string;
    tickFrequency?: number;
    ticksEpoch?: string;
    state?: CfsEventState;
    events: Record<string, CfsEventEntry>;
  }
}

export namespace v1_0 {
  export const cfsEventsSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "CFS Event File Schema",
    description: "Schema for CodeFusion Studio system event viewer files",
    type: "object",
    properties: {
      schemaVersion: {
        description:
          "Version of the json schema. This schema is only compatible with version 1.0",
        type: "string",
        pattern: "^1\\.0$",
      },
      lastUpdate: {
        description:
          "Timestamp of the last update of the events of this file, in ISO8601 format (e.g. 1992-03-23T12:34:56+00:00). Note that properties such as state may be updated without changing this timestamp.",
        type: "string",
        format: "date-time",
      },
      tickFrequency: {
        description:
          "Frequency of the timestamp generation clock, in Hz (ticks per second)",
        type: "number",
      },
      tickEpoch: {
        description:
          "Timestamp of the first tick (tick 0) of timestamp generator clock, in ISO8601 format (e.g. 1992-03-23T12:34:56+00:00).",
        type: "string",
        format: "date-time",
      },
      eventSources: {
        description:
          "Object containing all the recorded events. Each property name defines an event source and its value all the information related to it.",
        type: "object",
        additionalProperties: { $ref: "#/$defs/eventSource" },
      },
      eventSourceIndex: {
        description:
          "Ordered event source references and groups used to organize the timeline.",
        type: "array",
        items: { $ref: "#/$defs/eventSourceIndexEntry" },
      },
      state: {
        description:
          "Current state of the System Event Viewer session. This information is only used on a live session through custom content provider. Files can omit this property, on which case 'file' is assumed.",
        type: "string",
        default: "file",
        enum: CfsEventsStates,
      },
    },
    required: ["schemaVersion", "eventSources", "lastUpdate"],
    $defs: {
      eventSource: {
        description:
          "Information regarding an event source and its recorded events.",
        type: "object",
        properties: {
          events: {
            description:
              "Array of event occurrences, each containing a timestamp and an optional message.",
            type: "array",
            items: {
              $ref: "#/$defs/eventEntry",
            },
          },
        },
        required: ["events"],
      },
      eventEntry: {
        description:
          "Information regarding an event occurrence, containing a timestamp in clock ticks of 'tickFrequency' frequency since 'ticksEpoch', and an optional message.",
        type: "object",
        properties: {
          ts: {
            type: "integer",
          },
          msg: {
            type: "string",
          },
        },
        required: ["ts"],
      },
      eventSourceIndexEntry: {
        oneOf: [{ type: "string" }, { $ref: "#/$defs/eventSourceGroup" }],
      },
      eventSourceGroup: {
        description:
          "A named group containing event source references or nested groups.",
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          events: {
            type: "array",
            items: { $ref: "#/$defs/eventSourceIndexEntry" },
          },
        },
        required: ["name", "events"],
      },
    },
  } as const;

  export interface CfsEventEntry {
    ts: number;
    msg?: string;
  }

  export interface CfsEventSource {
    events: CfsEventEntry[];
  }

  export type CfsEventSourceIndexEntry = string | CfsEventSourceGroup;

  export interface CfsEventSourceGroup {
    name: string;
    events: CfsEventSourceIndexEntry[];
  }

  export interface CfsEventsFile {
    schemaVersion: "1.0";
    lastUpdate: string;
    tickFrequency?: number;
    tickEpoch?: string;
    state?: CfsEventState;
    eventSources: Record<string, CfsEventSource>;
    eventSourceIndex?: CfsEventSourceIndexEntry[];
  }
}

export namespace v0_3 {
  // V0.3 is exactly the same as V1.0 except that 'tickEpoch' was called 'ticksEpoch'.

  export const cfsEventsSchema = {
    ...v1_0.cfsEventsSchema,
    properties: {
      ...v1_0.cfsEventsSchema.properties,
      schemaVersion: {
        description:
          "Version of the json schema. This schema is only compatible with version 0.3",
        type: "string",
        pattern: "^0\\.3$",
      },
      ticksEpoch: {
        ...v1_0.cfsEventsSchema.properties.tickEpoch,
      },
      tickEpoch: false,
    },
  };

  export interface CfsEventsFile extends Omit<
    v1_0.CfsEventsFile,
    "schemaVersion" | "tickEpoch"
  > {
    schemaVersion: "0.3";
    ticksEpoch?: string;
  }
}

export const cfsEventsSchemas = {
  "0.2": v0_2.cfsEventsSchema,
  "0.3": v0_3.cfsEventsSchema,
  "1.0": v1_0.cfsEventsSchema,
};

// This type defines the type of the latest CFS events file schema.
// This is mainly used when we need to save/export event information,
// which we will always use the latest schema for.
export type LatestCfsEventsFile = v1_0.CfsEventsFile;

// TO DO: this type may be moved to webview after CFSIO-13600 is merged
// This is the type used on the rest of the code once the file is parsed.
// In the future this type could be completely decoupled from the file itself,
// and should be put in a common types file to be shared between the extension
// and the webview but this is what we have for the moment
export type CfsEventsData = Omit<v1_0.CfsEventsFile, "schemaVersion">;
