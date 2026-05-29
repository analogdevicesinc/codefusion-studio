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

import { expect } from "chai";

/**
 * Persisted DFG stream read from a saved cfsconfig file.
 */
export type PersistedDFGStream = {
  Source?: { Gasket?: string; BufferSize?: number };
  Destinations?: Array<{ Gasket?: string; BufferSize?: number }>;
  Description?: string;
  Group?: string;
};

const getMismatchReason = (
  stream: PersistedDFGStream,
  sourceName: string,
  expectedDestinations: string[],
  expectedDescription: string,
  expectedSourceBufferSize: number,
  expectedDestinationBufferSize: number[],
  expectedGroup: string | undefined,
): string | null => {
  const persistedSource = stream.Source;
  const persistedDestinations = stream.Destinations;

  if (!persistedSource || !persistedDestinations) {
    return "Stream is missing source or destinations";
  }

  if (persistedSource.Gasket !== sourceName) {
    return `Source mismatch: expected ${sourceName}, got ${persistedSource.Gasket ?? "missing"}`;
  }

  if (persistedSource.BufferSize !== expectedSourceBufferSize) {
    return `Source buffer mismatch: expected ${expectedSourceBufferSize}, got ${persistedSource.BufferSize ?? "missing"}`;
  }

  const hasAllExpectedDestinations = expectedDestinations.every(
    (destinationName, index) =>
      persistedDestinations.some(
        (destination) =>
          destination.Gasket === destinationName &&
          destination.BufferSize === expectedDestinationBufferSize[index],
      ),
  );

  if (!hasAllExpectedDestinations) {
    return `Destination mismatch: expected ${expectedDestinations.join(", ")} with buffer ${expectedDestinationBufferSize}`;
  }

  if (stream.Description !== expectedDescription) {
    return `Description mismatch: expected ${expectedDescription}, got ${stream.Description ?? "missing"}`;
  }

  if (expectedGroup !== undefined && stream.Group !== expectedGroup) {
    return `Group mismatch: expected ${expectedGroup}, got ${stream.Group ?? "missing"}`;
  }

  return null;
};

/**
 * Verifies that the persisted config contains a stream for the given source and
 * destination combination, then checks its alias, buffer sizes, and optional group.
 *
 * @param dfgStreams Parsed persisted DFG streams from the config file.
 * @param sourceName Expected source gasket name.
 * @param expectedDestinations Expected destination gasket names.
 * @param expectedDescription Expected persisted stream alias/description.
 * @param expectedSourceBufferSize Expected source buffer size.
 * @param expectedDestinationBufferSize Expected buffer size for each expected destination.
 * @param expectedGroup Optional expected persisted group name.
 */
export const assertPersistedStreamForSource = (
  dfgStreams: PersistedDFGStream[] | undefined,
  isDeleteCheck: boolean,
  sourceName: string,
  expectedDestinations: string[],
  expectedDescription: string,
  expectedSourceBufferSize: number,
  expectedDestinationBufferSize: number[],
  expectedGroup?: string,
) => {
  expect(dfgStreams, "DFG streams should exist in config file").to.not.be
    .undefined;

  const mismatchReasons: string[] = [];

  const matchedStream = (dfgStreams ?? []).find((stream) => {
    const reason = getMismatchReason(
      stream,
      sourceName,
      expectedDestinations,
      expectedDescription,
      expectedSourceBufferSize,
      expectedDestinationBufferSize,
      expectedGroup,
    );

    if (reason) {
      mismatchReasons.push(reason);
    }

    return reason === null;
  });

  if (isDeleteCheck === true) {
    expect(
      matchedStream,
      `Stream for source ${sourceName} with destinations ${expectedDestinations.join(", ")} should not be persisted in config${mismatchReasons.length > 0 ? `. Reasons: ${mismatchReasons.join(" | ")}` : ""}`,
    ).to.be.undefined;
  } else {
    expect(
      matchedStream,
      `Stream for source ${sourceName} with destinations ${expectedDestinations.join(", ")} should be persisted in config${mismatchReasons.length > 0 ? `. Reasons: ${mismatchReasons.join(" | ")}` : ""}`,
    ).to.not.be.undefined;
  }
};
