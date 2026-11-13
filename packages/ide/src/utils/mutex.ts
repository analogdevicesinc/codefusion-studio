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
 * A simple mutex that serializes asynchronous operations via promise chaining.
 *
 * @example
 * ```typescript
 * const mutex = new Mutex();
 *
 * // Serialize access to a shared resource.
 * async function updateResource(value: number) {
 *   return mutex.withLock(async () => {
 *     const current = await readSharedResource();
 *     await writeSharedResource(current + value);
 *   });
 * }
 *
 * // These calls run one after another, never concurrently.
 * await Promise.all([
 *   updateResource(1),
 *   updateResource(2),
 *   updateResource(3),
 * ]);
 * ```
 */
export class Mutex {
  private chain: Promise<unknown> = Promise.resolve();

  /**
   * Runs the given function exclusively, ensuring that every call is serialized.
   * @param fn The function to execute once the mutex is acquired.
   * @returns A promise that resolves with the result of the function.
   */
  withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const result = this.chain.then(() => fn());
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
