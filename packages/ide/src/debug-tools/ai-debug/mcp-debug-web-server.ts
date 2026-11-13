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
import {
  localhostHostValidation,
  NodeStreamableHTTPServerTransport,
} from "@modelcontextprotocol/node";
import express, { Request, Response } from "express";
import { CfsMcpServer } from "./mcp-server/cfs-mcp-server";
import type { McpServerDependencies } from "./mcp-server/cfs-mcp-server";
import { AddressInfo } from "net";
import { Uri } from "vscode";

/**
 * Streamable HTTP Web Server for the Debug MCP Server
 * Handles HTTP transport for MCP protocol with debug-specific functionality
 */
export class McpDebugStreamableWebServer {
  private app: express.Application = express();
  private appInstance?: ReturnType<express.Application["listen"]>;

  constructor(private deps: McpServerDependencies) {
    this.buildApp();
  }

  private buildApp() {
    // DNS rebinding protection: only accept requests addressed to a localhost Host
    const validateHost = localhostHostValidation();
    this.app.use((req, res, next) => {
      if (validateHost(req, res)) {
        next();
      }
    });

    this.app.use(express.json());

    // CORS restricted to localhost origins (MCP Inspector, webviews)
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;

      if (origin && !McpDebugStreamableWebServer.isAllowedOrigin(origin)) {
        res.status(403).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Invalid Origin: ${origin}`,
          },
          id: null,
        });
        return;
      }

      if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
      }

      res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    });

    // Handle MCP POST requests
    this.app.post("/mcp", async (req: Request, res: Response) => {
      console.log("CFS MCP: Connecting via streamable HTTP");
      try {
        const server = new CfsMcpServer(this.deps);

        // Create transport for this connection
        const transport = new NodeStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        // Connect and handle request
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on("close", () => {
          console.log("Request closed");
          transport.close();
          server.close();
        });
      } catch (error) {
        console.error("CFS MCP: Error handling request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    }); // Reject GET requests
    this.app.get("/mcp", async (_req: Request, res: Response) => {
      console.log("CFS MCP: Received GET request (rejected)");
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed. Use POST for MCP connections.",
          },
          id: null,
        }),
      );
    });

    // Reject DELETE requests
    this.app.delete("/mcp", async (_req: Request, res: Response) => {
      console.log("CFS MCP: Received DELETE request (rejected)");
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed. Use POST for MCP connections.",
          },
          id: null,
        }),
      );
    });
  }

  public start(port: number): Promise<void> {
    // Using a promise to allow async handling of server start and error events
    return new Promise<void>((resolve, reject) => {
      const host = "127.0.0.1";
      this.appInstance = this.app.listen(port, host, () => {
        console.log(`✅ CFS MCP server started successfully`);
        console.log(`   URL: http://localhost:${port}/mcp (bound to ${host})`);
        resolve();
      });

      this.appInstance.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          console.warn(
            `⚠️  CFS MCP: Port ${port} is already in use. Another VS Code/Cursor instance may be running.`,
          );
        } else {
          console.error(`❌ CFS MCP: Failed to start server: ${error.message}`);
        }
        reject(error);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.appInstance === undefined) {
        reject(
          new Error("CFS MCP: Trying to stop server while it is not running"),
        );
        return;
      }
      this.appInstance.close((error?: Error) => {
        if (error) {
          console.error("CFS MCP: Error stopping server:", error);
          reject(error);
        } else {
          console.log("CFS MCP: Server stopped successfully");
          this.appInstance = undefined;
          resolve();
        }
      });
    });
  }

  public isRunning(): boolean {
    return this.appInstance?.listening === true;
  }

  public getUri(): Uri | undefined {
    const address = this.appInstance?.address() as AddressInfo | null;
    const port = address?.port;
    return port ? Uri.parse(`http://localhost:${port}/mcp`) : undefined;
  }

  /**
   * Checks whether an Origin header value is allowed for CORS.
   * Only localhost origins (any port) and VS Code webview origins are permitted.
   */
  private static isAllowedOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);

      // Allow localhost origins on any port and scheme
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1" ||
        url.hostname === "[::1]"
      ) {
        return true;
      }

      // Allow VS Code webview origins (vscode-webview://<id>)
      if (url.protocol === "vscode-webview:") {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
