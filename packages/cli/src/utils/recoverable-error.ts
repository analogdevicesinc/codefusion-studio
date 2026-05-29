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
export class RecoverableError extends Error {
  constructor(
    message: string,
    public recovery: {
      suggestion: string;
      run?: string;
      example?: string;
    }
  ) {
    super(message);
  }

  toJson() {
    return {
      level: 'ERROR',
      msg: this.message,
      recovery: this.recovery
    };
  }

  toText() {
    let output = this.message;
    output += `\nSuggestion: ${this.recovery.suggestion}`;

    if (this.recovery.run) {
      output += `\nRun: ${this.recovery.run}`;
    }

    if (this.recovery.example) {
      output += `\nExample: ${this.recovery.example}`;
    }

    return output;
  }
}
