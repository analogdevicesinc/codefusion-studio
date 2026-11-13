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

/*
 * A minimal static file server used to back webview `fetch()` calls (e.g. the
 * Model Zoo) with deterministic local fixtures instead of a remote endpoint,
 * so E2E tests don't depend on network availability or upstream content.
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";

const MIME_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".tflite": "application/octet-stream",
  ".bin": "application/octet-stream",
};

export type LocalStaticServer = {
  readonly url: string;
  close(): Promise<void>;
};

export async function startStaticServer(
  rootDir: string,
): Promise<LocalStaticServer> {
  const resolvedRoot = path.resolve(rootDir);

  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const filePath = path.join(resolvedRoot, requestPath);

    if (!filePath.startsWith(resolvedRoot)) {
      res.writeHead(403);
      res.end();
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, {
        "Content-Type":
          MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(data);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
