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
 * This methods parses an ATB output trace data stream according to the information
 * provided by the Arm CoreSight Architecture Specification v3.0 section D4.
 *
 *
 * More information can be found on Arm CoreSight Architecture Specification v3.0
 * https://developer.arm.com/documentation/ihi0029/latest/
 *
 * @param buffer Buffer object containing the ATB output trace data stream.
 * @returns Record where the keys are the ATB IDs and the values are Buffer objects
 *          containing the data associated to each ID.
 */
export function parseATB(buffer: Buffer): Record<string, Buffer> {
  const FRAME_SIZE = 16;
  if (buffer.length % FRAME_SIZE !== 0) {
    throw new Error(
      `Length of the buffer (${buffer.length}) is not a multiple of the frame size (${FRAME_SIZE}).`,
    );
  }
  let dataRecord: Record<string, number[]> = {};
  let frameOffset = 0;
  let id = 0;
  let nextId: number | undefined = undefined;
  while (frameOffset < buffer.length) {
    const frame = buffer.subarray(frameOffset, frameOffset + FRAME_SIZE);
    const aux = frame[FRAME_SIZE - 1];
    for (let [index, byte] of frame.subarray(0, FRAME_SIZE - 1).entries()) {
      const idOrData = index % 2 === 0;
      if (idOrData) {
        /* eslint-disable no-bitwise */
        const auxBit = (aux >> (index / 2)) & 0x1;
        const isNewId = (byte & 0x1) !== 0;
        /* eslint-enable no-bitwise */
        if (isNewId) {
          // eslint-disable-next-line no-bitwise
          const newId = byte >>> 1;
          if (auxBit === 0) {
            id = newId;
          } else {
            nextId = newId;
          }
          continue;
        } else {
          byte += auxBit;
        }
      }
      if (id !== 0) {
        if (!(id in dataRecord)) {
          dataRecord[id] = [];
        }
        dataRecord[id].push(byte);
      }

      if (nextId !== undefined) {
        id = nextId;
        nextId = undefined;
      }
    }

    frameOffset += FRAME_SIZE;
  }
  return Object.fromEntries(
    Object.entries(dataRecord).map(([key, value]) => [key, Buffer.from(value)]),
  );
}
