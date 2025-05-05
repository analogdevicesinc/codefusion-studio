/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import { Dirent, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export class Utils {
    // remove all *files* in the given directory; doesn't remove subdirectories, doesn't recurse, etc.
    // silently does nothing if directory doesn't exist or is empty
    public static rmFilesSync(dir: string): void {
        this.walkFilesSync(dir, (filePath: string) => {
            rmSync(filePath);
        });
    }

    // walk in the given directory, invoking the given callback with each file's full path;
    // doesn't recurse and silently does nothing if directory doesn't exist or is empty
    public static walkFilesSync(
        dir: string,
        walkCallback: (filePath: string) => void,
    ): void {
        try {
            readdirSync(dir, { withFileTypes: true }).forEach(
                (f: Dirent) => {
                    if (f.isFile()) {
                        walkCallback(join(dir, f.name));
                    }
                },
            );
        } catch (err) {
            // can silently ignore
        }
    }
}
