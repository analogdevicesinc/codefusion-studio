/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

export interface SocDiagramData {
  meta: Record<string, string>;
  parts: Record<string, SocDiagramNode>;
  wires: Record<string, SocDiagramClocks>;
  junctions: unknown;
  annotations: unknown;
  symbols: unknown;
}

export interface SocDiagramClocks {
  id: string;
  netID: string;
  type: string;
  clock: string;
  condition?: string;
  enabled?: boolean;
  mount?: string;
  startPoint: SocCanvasClockCoordinates;
  endPoint: SocCanvasClockCoordinates;
}

export interface SocCanvasClockCoordinates {
  id: string;
  x: number;
  y: number;
}

export interface SocDiagramNode {
  name: string;
  id: string;
  styles: SocDiagramStyles;
  icon: string;
  background: string;
  group: string;
  clockReference?: string;
  metadata: {
    name?: string;
    group: string;
    description?: string;
    type?: string;
    inputTerminals?: SocNodeTerminal[];
    outputTerminals?: SocNodeTerminal[];
  };
  condition?: string;
  mount?: string;
  enabled?: boolean;
  error?: boolean;
  outputTerminals?: Record<string, SocNodeTerminal>;
}

export interface SocNodeTerminal {
  shape: string;
  x: number;
  y: number;
  radius: number;
  position: string;
  id: string;
  type: string;
  netID: string;
}

export interface SocDiagramStyles {
  backgroundColor: string;
  fontColor: string;
  circleColor: string;
  borderColor: string;
  icon?: string;
}
