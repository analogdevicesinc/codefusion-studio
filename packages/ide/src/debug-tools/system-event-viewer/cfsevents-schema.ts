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

// TO DO: these types may be moved to webview after CFSIO-13600 is merged
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
