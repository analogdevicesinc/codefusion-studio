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

import * as vscode from "vscode";

// Module-level extension context for icon resolution
let extensionContext: vscode.ExtensionContext;

function getIcon(name: string): vscode.IconPath {
  const iconPath = vscode.Uri.joinPath(
    extensionContext.extensionUri,
    "resources",
    "icons",
    "cti",
  );
  return {
    light: vscode.Uri.joinPath(iconPath, "light", `${name}.svg`),
    dark: vscode.Uri.joinPath(iconPath, "dark", `${name}.svg`),
  };
}

const STATE_ICON_MODIFIER: Record<CtiConnectionState, string> = {
  Offline: "",
  Active: "_applied",
  Pending: "_pending",
  Error: "_error",
};

export interface SerializedConnection {
  customName?: string;
  inputTriggers: string[];
  outputTriggers: string[];
  enabled: boolean;
}

export type CtiConnectionState = "Offline" | "Pending" | "Active" | "Error";

/**
 * Represents a CTI (Cross Trigger Interface) connection between input and output triggers.
 */
export class CtiConnectionItem {
  private customName: string | undefined = undefined;
  private state: CtiConnectionState = "Offline";
  private enabled = true;
  private errorMessage: string | undefined = undefined;
  inputTriggers: CtiTriggerItem[] = [];
  outputTriggers: CtiTriggerItem[] = [];

  /**
   * Creates a new CTI connection with the given input and output trigger labels.
   * @param inputTriggerLabels Names of the input CTI triggers.
   * @param outputTriggerLabels Names of the output CTI triggers.
   */
  constructor(inputTriggerLabels: string[], outputTriggerLabels: string[]) {
    this.inputTriggers = inputTriggerLabels.map(
      (x) => new CtiTriggerItem(x, "input", this),
    );
    this.outputTriggers = outputTriggerLabels.map(
      (x) => new CtiTriggerItem(x, "output", this),
    );
    this.customName = undefined;
  }

  /**
   * Sets the connection's current state.
   * @param newState The new state to apply.
   * @param message Error message to display; required when `newState` is `"Error"`.
   */
  public setState(newState: "Error", message: string): void;
  public setState(newState: Exclude<CtiConnectionState, "Error">): void;
  public setState(newState: CtiConnectionState, message?: string): void {
    this.errorMessage = newState === "Error" ? message : undefined;
    this.state = newState;
  }

  /**
   * Returns the connection's current state.
   */
  public getState(): CtiConnectionState {
    return this.state;
  }

  /**
   * Whether this connection is enabled. Disabled connections are not applied to hardware.
   */
  public get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enables or disables the connection.
   * @param value `true` to enable, `false` to disable.
   */
  public setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * The display name of the connection. Returns the custom name if set; otherwise
   * joins the input trigger names with a comma.
   */
  public get name(): string {
    return this.customName ?? this.inputTriggers.map((x) => x.name).join(", ");
  }

  /**
   * Sets a custom display name that overrides the auto-generated trigger-based label.
   * @param newName The custom name to assign.
   */
  public set name(newName: string) {
    this.customName = newName;
  }

  /**
   * Converts this connection to a VS Code `TreeItem` with the appropriate label,
   * checkbox state, icon, and description for the current connection state.
   */
  public toTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.name,
      vscode.TreeItemCollapsibleState.Expanded,
    );
    item.checkboxState = this.enabled
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked;
    item.iconPath = this.getItemIcon();
    item.contextValue = "cfs.cti.connection";
    item.description = this.getItemDescription();
    if (this.state === "Error" && this.errorMessage) {
      item.tooltip = this.errorMessage;
    }
    item.accessibilityInformation = {
      label: vscode.l10n.t("{0}, {1}", this.name, item.description ?? ""),
    };
    return item;
  }

  /**
   * Serializes this connection to a plain object suitable for workspace state persistence.
   * @returns A `SerializedConnection` containing the custom name, trigger names, and enabled flag.
   */
  public serialize(): SerializedConnection {
    return {
      customName: this.customName,
      inputTriggers: this.inputTriggers.map((t) => t.name),
      outputTriggers: this.outputTriggers.map((t) => t.name),
      enabled: this.enabled,
    };
  }

  /**
   * Creates a `CtiConnectionItem` from a plain serialized object.
   * @param data The serialized connection data, typically read from workspace state.
   * @returns A new `CtiConnectionItem` restored from `data`.
   */
  public static fromSerialized(data: SerializedConnection): CtiConnectionItem {
    const connection = new CtiConnectionItem(
      data.inputTriggers,
      data.outputTriggers,
    );
    if (data.customName) {
      connection.name = data.customName;
    }
    connection.enabled = data.enabled;
    return connection;
  }

  /**
   * Returns the child trigger items displayed under this connection in the tree.
   * When the connection has a single unnamed input, input triggers are collapsed
   * into the connection row and only output triggers are returned as children.
   */
  public getChildren(): CtiTriggerItem[] {
    return [
      ...(this.isSingleInput() ? [] : this.inputTriggers),
      ...this.outputTriggers,
    ];
  }

  /**
   * Returns `true` if `other` has the same input and output trigger names as this
   * connection (order-independent). Custom names are cosmetic and not considered.
   * @param other The connection to compare against.
   */
  public equals(other: CtiConnectionItem): boolean {
    const arraysEqual = (a: string[], b: string[]): boolean => {
      if (a.length !== b.length) {
        return false;
      }
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    };

    return (
      arraysEqual(
        this.inputTriggers.map((t) => t.name),
        other.inputTriggers.map((t) => t.name),
      ) &&
      arraysEqual(
        this.outputTriggers.map((t) => t.name),
        other.outputTriggers.map((t) => t.name),
      )
    );
  }

  /**
   * Returns `true` when the connection has exactly one input trigger and no custom name,
   * causing the input trigger to be represented by the connection row itself.
   */
  private isSingleInput(): boolean {
    return this.customName === undefined && this.inputTriggers.length === 1;
  }

  /**
   * Returns the description string rendered next to the item label in the tree,
   * or `undefined` when no description should be shown.
   */
  private getItemDescription(): string | undefined {
    switch (this.state) {
      case "Pending":
        return vscode.l10n.t("Pending");
      case "Error":
        return vscode.l10n.t("Not applied");
      default:
        return undefined;
    }
  }

  /**
   * Returns the icon path for this connection, combining the base icon name with
   * the state-specific modifier from `STATE_ICON_MODIFIER`.
   */
  private getItemIcon(): vscode.IconPath {
    let baseIcon: string;
    if (this.isSingleInput()) {
      baseIcon = "trigger_input";
    } else {
      baseIcon = "connection_input";
    }
    return getIcon(`${baseIcon}${STATE_ICON_MODIFIER[this.state]}`);
  }
}

/**
 * Represents a CTI trigger (input or output).
 */
export class CtiTriggerItem {
  /**
   * Creates a CTI trigger item.
   * @param name The trigger signal name.
   * @param direction Whether this is an input or output trigger.
   * @param parentConnection The connection that owns this trigger.
   */
  constructor(
    public name: string,
    public direction: "input" | "output",
    public readonly parentConnection: CtiConnectionItem,
  ) {}

  public toTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(this.name);
    item.iconPath = this.getItemIcon();
    item.contextValue = "cfs.cti.trigger";
    return item;
  }

  private getItemIcon(): vscode.IconPath {
    const iconName =
      this.direction === "input" ? "trigger_input" : "trigger_output";
    return getIcon(iconName);
  }
}

export type CtiConfigItem = CtiConnectionItem | CtiTriggerItem;

/**
 * Tree data provider for CTI configuration view.
 */
export class CtiConfigTreeProvider implements vscode.TreeDataProvider<CtiConfigItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    void | CtiConfigItem | CtiConfigItem[]
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private connections: CtiConnectionItem[];

  /**
   * Creates the tree provider, initializing the module-level extension context used
   * for icon URI resolution.
   * @param context The VS Code extension context.
   * @param initialConnections Optional list of connections to populate the tree with.
   */
  constructor(
    context: vscode.ExtensionContext,
    initialConnections: CtiConnectionItem[] = [],
  ) {
    this.connections = initialConnections;
    // Set module-level context for icon resolution
    extensionContext = context;
  }

  /**
   * Returns the current list of connection items managed by this provider.
   */
  public getConnections(): CtiConnectionItem[] {
    return this.connections;
  }

  /**
   * Fires the `onDidChangeTreeData` event to trigger a full tree refresh.
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Creates a new `CtiConnectionItem` with the given trigger labels, appends it to the
   * connection list, and fires a tree-data change event.
   * Returns the existing connection without adding a duplicate if the same set of
   * input and output trigger names is already present.
   * @param inputTriggers Names of the input triggers for the new connection.
   * @param outputTriggers Names of the output triggers for the new connection.
   * @returns The newly created connection, or the existing one if a duplicate was found.
   */
  public addConnection(
    inputTriggers: string[],
    outputTriggers: string[],
  ): CtiConnectionItem {
    const candidate = new CtiConnectionItem(inputTriggers, outputTriggers);
    const existing = this.connections.find((c) => c.equals(candidate));
    if (existing) {
      return existing;
    }
    this.connections.push(candidate);
    this._onDidChangeTreeData.fire();
    return candidate;
  }

  /**
   * Removes a connection or trigger from the tree. Removing a `CtiConnectionItem`
   * splices it from the connections list; removing a `CtiTriggerItem` splices it
   * from its parent connection's trigger list.
   * @param item The connection or trigger to remove.
   */
  public removeItem(item: CtiConfigItem): void {
    if (item instanceof CtiConnectionItem) {
      // Remove connection
      const index = this.connections.indexOf(item);
      if (index > -1) {
        this.connections.splice(index, 1);
        this._onDidChangeTreeData.fire();
      }
    } else if (item instanceof CtiTriggerItem) {
      // Find and remove trigger from its parent connection
      for (const connection of this.connections) {
        const inputIndex = connection.inputTriggers.indexOf(item);
        if (inputIndex > -1) {
          connection.inputTriggers.splice(inputIndex, 1);
          this._onDidChangeTreeData.fire(connection);
          return;
        }
        const outputIndex = connection.outputTriggers.indexOf(item);
        if (outputIndex > -1) {
          connection.outputTriggers.splice(outputIndex, 1);
          this._onDidChangeTreeData.fire(connection);
          return;
        }
      }
    }
  }

  /**
   * Updates the display name of `connection` and fires a targeted tree-data change event.
   * @param connection The connection to rename.
   * @param newName The new display name to apply.
   */
  public renameConnection(
    connection: CtiConnectionItem,
    newName: string,
  ): void {
    connection.name = newName;
    this._onDidChangeTreeData.fire(connection);
  }

  /**
   * Sets the state of `connection` and fires a targeted tree-data change event.
   * @param connection The connection to update.
   * @param state The new state to apply.
   * @param message Error message to display; required when `state` is `"Error"`.
   */
  public setConnectionState(
    connection: CtiConnectionItem,
    state: "Error",
    message: string,
  ): void;
  public setConnectionState(
    connection: CtiConnectionItem,
    state: Exclude<CtiConnectionState, "Error">,
  ): void;
  public setConnectionState(
    connection: CtiConnectionItem,
    state: CtiConnectionState,
    message?: string,
  ): void {
    if (state === "Error") {
      connection.setState(state, message!);
    } else {
      connection.setState(state);
    }
    this._onDidChangeTreeData.fire(connection);
  }

  /**
   * Sets the enabled state of `connection` and fires a targeted tree-data change event.
   * @param connection The connection to update.
   * @param enabled `true` to enable, `false` to disable.
   */
  public setConnectionEnabled(
    connection: CtiConnectionItem,
    enabled: boolean,
  ): void {
    connection.setEnabled(enabled);
    this._onDidChangeTreeData.fire(connection);
  }

  /**
   * Appends new input triggers to `connection` and fires a targeted tree-data change event.
   * @param connection The connection to extend.
   * @param triggerLabels Names of the input triggers to add.
   */
  public addInputTriggers(
    connection: CtiConnectionItem,
    triggerLabels: string[],
  ): void {
    const newTriggers = triggerLabels.map(
      (label) => new CtiTriggerItem(label, "input", connection),
    );
    connection.inputTriggers.push(...newTriggers);
    this._onDidChangeTreeData.fire(connection);
  }

  /**
   * Appends new output triggers to `connection` and fires a targeted tree-data change event.
   * @param connection The connection to extend.
   * @param triggerLabels Names of the output triggers to add.
   */
  public addOutputTriggers(
    connection: CtiConnectionItem,
    triggerLabels: string[],
  ): void {
    const newTriggers = triggerLabels.map(
      (label) => new CtiTriggerItem(label, "output", connection),
    );
    connection.outputTriggers.push(...newTriggers);
    this._onDidChangeTreeData.fire(connection);
  }

  /**
   * Adds multiple connections to the provider, skipping any that are duplicates of
   * an existing connection (as determined by `CtiConnectionItem.equals`). Fires a
   * full tree-data change event after all additions.
   * @param connections The connections to add.
   */
  public addConnections(connections: CtiConnectionItem[]): void {
    const added: CtiConnectionItem[] = [];
    for (const c of connections) {
      if (
        !this.connections.some((existing) => existing.equals(c)) &&
        !added.some((accepted) => accepted.equals(c))
      ) {
        added.push(c);
      }
    }
    if (added.length === 0) {
      return;
    }
    this.connections.push(...added);
    this._onDidChangeTreeData.fire();
  }

  /**
   * Checks whether any other connection in the tree has the same trigger set as
   * `connection` after a mutation (add or remove trigger). If a duplicate is found,
   * removes `connection` from the tree and returns the pre-existing entry so the
   * caller can apply state updates to the surviving connection. Returns `connection`
   * unchanged when no duplicate exists.
   * @param connection The recently mutated connection to check.
   * @returns The surviving connection — either `connection` itself or the duplicate.
   */
  public mergeIfDuplicate(connection: CtiConnectionItem): CtiConnectionItem {
    const duplicate = this.connections.find(
      (c) => c !== connection && c.equals(connection),
    );
    if (!duplicate) {
      return connection;
    }
    if (connection.isEnabled) {
      duplicate.setEnabled(true);
    }
    this.removeItem(connection);
    return duplicate;
  }

  /**
   * Returns the VS Code `TreeItem` representation of `element`.
   * @param element The connection or trigger item to render.
   */
  getTreeItem(element: CtiConfigItem): vscode.TreeItem {
    return element.toTreeItem();
  }

  /**
   * Returns the children of `element`. At the root level (element `undefined`) all
   * connections are returned. Trigger items have no children. Connection items
   * delegate to `CtiConnectionItem.getChildren`.
   * @param element The parent item, or `undefined` for the root level.
   */
  getChildren(
    element: CtiConfigItem | undefined,
  ): vscode.ProviderResult<CtiConfigItem[]> {
    if (!element) {
      // Root level returns all connections
      return this.connections;
    }
    if (element instanceof CtiTriggerItem) {
      // Trigger items have no children
      return [];
    }

    return element.getChildren();
  }

  /**
   * Disposes the `onDidChangeTreeData` event emitter.
   */
  public dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
