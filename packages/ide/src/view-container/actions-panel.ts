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

import * as vscode from "vscode";

import {
  LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID,
  EXECUTE_TASK,
  RUN_DEFAULT_BUILD_TASKS_COMMAND_ID,
} from "../commands/constants";
import {
  BEAKER,
  BUILD_ACTION,
  BUILD_ALL_ACTION,
  CLEAN_ACTION,
  COPY_AND_EDIT_TASK_CONTEXT,
  DEBUG,
  DEBUG_ACTION,
  DEBUG_ALT,
  DEBUG_LAUNCH_CONTEXT,
  DEBUG_TASK_CONTEXT,
  ERASE_ACTION,
  FLASH_ACTION,
  OZONE_DEBUG_ACTION,
  SECURITY_ACTION,
  SECURITY_TASKS_SEARCH_STRING,
  TOOLS,
  WORKSPACE_CONTEXT,
  ZAP,
} from "../constants";
import { ViewContainerItem } from "./view-container-item";
import { ContextBase } from "./context-base";
import { Utils } from "../utils/utils";

/**
 * The ActionTree class extends the vscode.TreeItem class and is used to create action trees for the viewContainer Actions panel.
 * The constructor takes in parameters for icon, label, and collapsible state.
 * It sets these properties on the instance and initializes the iconPath property used by the tree view.
 */
class ActionTree extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsible?: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsible);
  }
}

/**
 * This provider is responsible for supplying data in the Actions panel tree structure within the view container.
 */
export class ActionsViewProvider
  extends ContextBase
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private allTasks: vscode.Task[] = [];

  private localTasks: vscode.Task[] = [];

  private actionItems: (ViewContainerItem | ActionTree)[] = [];

  private hasInitialized = false;

  refreshEvent = new vscode.EventEmitter<ViewContainerItem | null>();

  onDidChangeTreeData: vscode.Event<ViewContainerItem | null> =
    this.refreshEvent.event;

  constructor() {
    super();
    this.initializeFileSystemWatcher();
  }

  onContextChanged(): void {
    this.initializeActionItems().then(() => {
      this.refreshEvent.fire(null);
    });
  }

  /**
   * Initializes the action items for the view container.
   *
   * This method fetches all available tasks for the active context and populates the actions.
   * It populates the `actionItems` array with with some
   * predefined actions such as erase, flash, and debug.
   *
   * @returns {Promise<ViewContainerItem[]>} A promise that resolves to an array of initialized action items.
   */
  async initializeActionItems(): Promise<void> {
    this.actionItems = [];
    this.actionItems.push(
      new ActionTree(BUILD_ACTION, vscode.TreeItemCollapsibleState.Expanded),
      new ActionTree(CLEAN_ACTION, vscode.TreeItemCollapsibleState.Expanded),
      new ActionTree(ERASE_ACTION, vscode.TreeItemCollapsibleState.Expanded),
      new ActionTree(FLASH_ACTION, vscode.TreeItemCollapsibleState.Expanded),
      new ActionTree(DEBUG_ACTION, vscode.TreeItemCollapsibleState.Expanded),
    );

    /**
     * Show `Debug with ozone` only when a project is selected
     */
    if (this.activeContext !== WORKSPACE_CONTEXT) {
      this.actionItems.push(
        new ViewContainerItem({
          icon: new vscode.ThemeIcon(DEBUG),
          label: OZONE_DEBUG_ACTION,
          commandId: LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID,
          commandArgs: [],
          collapsible: vscode.TreeItemCollapsibleState.None,
        }),
      );
    }

    const tasks = await Utils.retryWithDelay(this.getVscodeTasks);

    this.localTasks = await this.getUserDefinedTasks();
    this.allTasks = [...this.localTasks, ...tasks].filter((task) =>
      this.taskMatchesActiveContext(task),
    );

    //Adding security action section if a security task exists
    if (
      !this.actionItems.some(
        (item) => item instanceof ActionTree && item.label === SECURITY_ACTION,
      ) &&
      this.hasSecurityTasks(this.allTasks)
    ) {
      this.actionItems.push(
        new ActionTree(
          SECURITY_ACTION,
          vscode.TreeItemCollapsibleState.Expanded,
        ),
      );
    }

    this.hasInitialized = true;

    // New content is available, so refresh the view.
    this.refreshEvent.fire(null);
  }

  //Checks if the tasks contain a security task
  hasSecurityTasks(allTasks: vscode.Task[]) {
    return allTasks.some((task) => {
      return (
        task.name
          .toLowerCase()
          .includes(SECURITY_TASKS_SEARCH_STRING.generateKey) &&
        (task.source === "CFS" || task.source === "Workspace")
      );
    });
  }

  /**
   * Gets the tree item associated with the specified element.
   * @param element - The element for which the UI representation is needed.
   * @returns - The tree item representation of the provided element.
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Retrieves the children elements for the actions panel in the view container.
   *
   * @param element - An optional ActionItem element. If provided, the method will return the children of this element.
   * @returns A promise that resolves to an array of TreeItem elements representing the children.
   *
   * If no workspace folders are present, a message prompting the user to add a CFS project is returned.
   * If the action items have not been initialized, the method initializes them and returns.
   * If no element is provided, the method returns the top-level action items.
   * Depending on the label of the provided element, the method returns the corresponding action items for tasks such as build, clean, erase, flash, or debug.
   */
  async getChildren(element?: ViewContainerItem) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    //Checking if folders are present in the workspace
    if (workspaceFolders === undefined || workspaceFolders.length === 0) {
      return [
        new vscode.TreeItem(
          "Please open a CFS Workspace or create a new CFS project.",
        ),
      ];
    }

    //Check if the folder is a CFS folder
    const cfsConfig = vscode.workspace.getConfiguration(
      "cfs",
      workspaceFolders[0],
    );
    if (cfsConfig.get("configureWorkspace") !== "Yes") {
      return [
        new vscode.TreeItem("Workspace is not configured as CFS Workspace."),
      ];
    }

    if (!this.hasInitialized) {
      await this.initializeActionItems();
      return;
    }

    if (this.hasInitialized && this.allTasks.length === 0) {
      const settingsJsonFiles =
        await Utils.findFilesInWorkspace("**/settings.json");

      for (const file of settingsJsonFiles) {
        const settingsContent = await vscode.workspace.fs.readFile(
          vscode.Uri.file(file),
        );
        const settingsString = settingsContent.toString();

        if (
          settingsString.includes('"cfs.project.firmwarePlatform": "Baremetal"')
        ) {
          return [
            new vscode.TreeItem(
              "No tasks provided for registers-only projects.",
            ),
          ];
        }
      }

      return [new vscode.TreeItem("No tasks found in CFS Workspace.")];
    }

    if (element === undefined) {
      return this.actionItems;
    }

    switch (element.label) {
      case BUILD_ACTION:
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (this.activeContext === WORKSPACE_CONTEXT && workspaceFolder) {
          return await this.getBuildTasks();
        } else {
          return await this.getActionItemsForTasks("build", TOOLS, false);
        }
      case CLEAN_ACTION:
        return await this.getActionItemsForTasks("clean", BEAKER, false);
      case ERASE_ACTION:
        return await this.getActionItemsForTasks("erase");
      case FLASH_ACTION:
        return await this.getActionItemsForTasks("flash");
      case DEBUG_ACTION:
        return await this.getDebugActions(workspaceFolders);
      case SECURITY_ACTION:
        return this.getActionItemsForSecurityTasks(
          SECURITY_TASKS_SEARCH_STRING.generateKey,
        );
      default:
        return [];
    }
  }

  /**
   * Retrieves an action item based on its label.
   *
   * @param label - The label of the action item to retrieve.
   * @returns The action item with the specified label, or undefined if not found.
   */
  getElement(label: string): ViewContainerItem | undefined {
    return this.actionItems.find(
      (item) => item.label === label,
    ) as ViewContainerItem;
  }

  getVscodeTasks(): Promise<vscode.Task[]> {
    return new Promise((resolve, reject) => {
      vscode.tasks.fetchTasks({ type: "shell" }).then(
        (tasks) => {
          if (tasks.length === 0) {
            resolve([]);
          } else {
            resolve(tasks);
          }
        },
        (error) => {
          console.log(error);
          reject();
        },
      );
    });
  }

  /**
   * Returns all user defined tasks
   *
   * @returns A list of all tasks from tasks.json files
   */
  async getUserDefinedTasks(): Promise<vscode.Task[]> {
    const tasksJsonFiles = await Utils.findFilesInWorkspace("**/tasks.json");
    const localTasks = (
      await Promise.all(
        tasksJsonFiles
          .map((filePath) => vscode.Uri.file(filePath))
          .map(async (uri) => vscode.workspace.fs.readFile(uri)),
      )
    )
      .map((fileBuffer) => Buffer.from(fileBuffer).toString("utf8"))
      .map((encodedJson) => JSON.parse(encodedJson) as Record<string, any>)
      .map((jsonContent) => jsonContent.tasks)
      .flatMap((tasks, index) =>
        tasks.map((task: any) => ({
          ...task,
          name: task.label,
          source: "Workspace",
          scope: {
            name: Utils.getContextFromFullPath(tasksJsonFiles[index]),
          },
          type: "shell",
        })),
      );

    return localTasks;
  }

  /**
   * Retrieves a list of debug actions for the provided workspace folders.
   *
   * @param workspaceFolders - An array of workspace folders or undefined.
   * @returns A promise that resolves to an array of ActionItem objects representing debug actions.
   */
  getDebugActions(
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
  ) {
    let actions: ViewContainerItem[] = [];
    workspaceFolders
      ?.filter(
        (folder) =>
          folder.name === this.activeContext ||
          this.activeContext === WORKSPACE_CONTEXT,
      )
      .forEach((workspaceFolder: vscode.WorkspaceFolder) => {
        const configuration = vscode.workspace.getConfiguration(
          "launch",
          workspaceFolder,
        );
        const launchConfigs = configuration.get(
          "configurations",
        ) as vscode.DebugConfiguration[];
        launchConfigs.forEach((launchConfig: vscode.DebugConfiguration) => {
          actions.push(
            new ViewContainerItem({
              icon: new vscode.ThemeIcon(DEBUG_ALT),
              label: launchConfig.name,
              commandId: undefined,
              commandArgs: [workspaceFolder, launchConfig.name],
              collapsible: vscode.TreeItemCollapsibleState.None,
              contextValue: DEBUG_LAUNCH_CONTEXT,
            }),
          );
        });
      });

    actions.push(
      new ViewContainerItem({
        icon: new vscode.ThemeIcon("add"),
        label: "Add configuration...",
        commandId: "debug.addConfiguration",
        commandArgs: [],
        collapsible: vscode.TreeItemCollapsibleState.None,
      }),
    );

    return Promise.resolve(actions);
  }

  /**
   * Retrieves action items for tasks that match a specified substring in their names.
   *
   * @param taskNameSubstring - The substring to filter task names.
   * @param icon - The icon to be used for the action items. Defaults to `ZAP`.
   * @param exactMatch - Whether to match the task names exactly. Defaults to `false`.
   * @returns A promise that resolves to an array of `vscode.TreeItem` representing the action items.
   */
  //TODO: Remove async as it is redundant
  async getActionItemsForTasks(
    taskNameSubstring: string,
    icon = ZAP,
    exactMatch = false,
  ) {
    const actionItems: ViewContainerItem[] = [];
    let filteredTasks: vscode.Task[];

    //Filters the list of all tasks to include only those that match the specified criteria.
    if (!exactMatch) {
      filteredTasks = this.allTasks.filter((task) => {
        return (
          task.name.toLowerCase().includes(taskNameSubstring) &&
          (task.source === "CFS" ||
            (task.source === "Workspace" &&
              task.name.toLocaleLowerCase().includes("cfs")))
        );
      });
    } else {
      filteredTasks = this.allTasks.filter((task) => {
        return (
          task.name.toLowerCase() === taskNameSubstring &&
          (task.source === "CFS" ||
            (task.source === "Workspace" &&
              task.name.toLocaleLowerCase().includes("cfs")))
        );
      });
    }

    filteredTasks.forEach((task) => {
      let displayName = this.getDisplayName(task.name);

      // Check if task.scope is an instance of vscode.WorkspaceFolder
      if ((task.scope as vscode.WorkspaceFolder)?.name !== undefined) {
        displayName = `${displayName} (${(task.scope as vscode.WorkspaceFolder).name})`;
      }
      // Check if task.scope is equal to vscode.TaskScope.Workspace
      else if (task.scope === vscode.TaskScope.Workspace) {
        displayName = `${displayName} (Workspace)`;
      }

      let contextValue = COPY_AND_EDIT_TASK_CONTEXT;
      if (this.isTaskSourceJson(task.name)) {
        contextValue = DEBUG_TASK_CONTEXT;
      }

      actionItems.push(
        new ViewContainerItem({
          icon: new vscode.ThemeIcon(icon),
          label: displayName,
          commandId: EXECUTE_TASK,
          commandArgs: [task],
          collapsible: vscode.TreeItemCollapsibleState.None,
          contextValue: contextValue,
        }),
      );
    });

    return actionItems;
  }

  /**
   * Retrieves a list of action items for security-related tasks based on a given substring
   * and an optional icon. Filters tasks by their name and source, and formats their display
   * names based on their scope.
   *
   * @param taskNameSubstring - A substring to filter task names. Only tasks whose names
   *                             include this substring (case-insensitive) will be included.
   * @param icon - An optional icon to associate with each action item. Defaults to `ZAP`.
   * @returns An array of `ViewContainerItem` objects representing the filtered tasks,
   *          each with a label, icon, and associated command for execution.
   */
  getActionItemsForSecurityTasks(taskNameSubstring: string, icon = ZAP) {
    const actionItems: ViewContainerItem[] = [];
    let filteredTasks: vscode.Task[];

    filteredTasks = this.allTasks.filter((task) => {
      return (
        task.name.toLowerCase().includes(taskNameSubstring) &&
        (task.source === "CFS" || task.source === "Workspace")
      );
    });

    filteredTasks.forEach((task) => {
      let displayName = this.getDisplayName(task.name);

      // Check if task.scope is an instance of vscode.WorkspaceFolder
      if ((task.scope as vscode.WorkspaceFolder)?.name !== undefined) {
        displayName = `${displayName} (${(task.scope as vscode.WorkspaceFolder).name})`;
      }
      // Check if task.scope is equal to vscode.TaskScope.Workspace
      else if (task.scope === vscode.TaskScope.Workspace) {
        displayName = `${displayName} (Workspace)`;
      }

      let contextValue = COPY_AND_EDIT_TASK_CONTEXT;
      if (this.isTaskSourceJson(task.name)) {
        contextValue = DEBUG_TASK_CONTEXT;
      }

      actionItems.push(
        new ViewContainerItem({
          icon: new vscode.ThemeIcon(icon),
          label: displayName,
          commandId: EXECUTE_TASK,
          commandArgs: [task],
          collapsible: vscode.TreeItemCollapsibleState.None,
          contextValue: contextValue,
        }),
      );
    });

    return actionItems;
  }

  async getBuildTasks() {
    try {
      const tasks = await vscode.tasks.fetchTasks();
      const defaultTasksExist = tasks.some((task) => task.group?.isDefault);

      if (defaultTasksExist) {
        const buildAllTask = new ViewContainerItem({
          icon: new vscode.ThemeIcon(TOOLS),
          label: BUILD_ALL_ACTION,
          commandId: RUN_DEFAULT_BUILD_TASKS_COMMAND_ID,
          commandArgs: [],
          collapsible: vscode.TreeItemCollapsibleState.None,
        });

        let buildTasks = await this.getActionItemsForTasks(
          "build",
          TOOLS,
          false,
        );

        return [buildAllTask, ...buildTasks];
      }
    } catch (error) {
      console.error("Failed to retrieve tasks", error);
    }
    return this.getActionItemsForTasks("build", TOOLS, false);
  }

  /**
   * Updates the task actions by fetching the latest tasks and comparing them with the existing tasks.
   * It identifies the added and removed tasks, updates the internal task list, and refreshes the task-related UI components.
   *
   * @remarks
   * This method fetches the latest tasks, compares them with the current tasks,
   * and updates the `allTasks` array. It then calls `refreshEraseTasks` and `refreshFlashTasks` with the names of the
   * added and removed tasks to update the UI accordingly.
   */
  updateTaskActions() {
    const oldTasks = this.allTasks;

    vscode.tasks.fetchTasks().then(async (newTasks) => {
      const addedTasks = newTasks.filter(
        (newTask) => !oldTasks.some((oldTask) => oldTask.name === newTask.name),
      );
      const removedTasks = oldTasks.filter(
        (oldTask) => !newTasks.some((newTask) => newTask.name === oldTask.name),
      );

      // Update the allTasks array with the new tasks
      this.allTasks = newTasks.filter((task) =>
        this.taskMatchesActiveContext(task),
      );

      const taskNames = [
        ...addedTasks.map((task) => task.name),
        ...removedTasks.map((task) => task.name),
      ];

      if (taskNames.length > 0) {
        this.localTasks = await this.getUserDefinedTasks();
      }

      this.refreshBuildTasks(taskNames);
      this.refreshCleanTasks(taskNames);
      this.refreshEraseTasks(taskNames);
      this.refreshFlashTasks(taskNames);
      this.refreshSecurityTasks(taskNames);
    });
  }

  refreshBuildTasks(taskNames: string[]) {
    if (taskNames.some((taskName) => taskName.includes("build"))) {
      const buildElement = this.getElement(BUILD_ACTION);
      if (buildElement) this.refreshEvent.fire(buildElement);
    }
  }

  refreshCleanTasks(taskNames: string[]) {
    if (taskNames.some((taskName) => taskName.includes("clean"))) {
      const cleanElement = this.getElement(CLEAN_ACTION);
      if (cleanElement) this.refreshEvent.fire(cleanElement);
    }
  }
  /**
   * Refreshes the erase tasks by checking if any of the provided task names include the substring "erase".
   * If a matching task is found, it retrieves the corresponding erase action element and triggers a refresh event for it.
   *
   * @param taskNames - An array of task names that were updated
   */
  refreshEraseTasks(taskNames: string[]) {
    if (taskNames.some((taskName) => taskName.includes("erase"))) {
      const eraseElement = this.getElement(ERASE_ACTION);
      if (eraseElement) this.refreshEvent.fire(eraseElement);
    }
  }

  /**
   * Refreshes the flash tasks if any of the provided task names include the word "flash".
   *
   * @param taskNames - An array of task names that were updated
   */
  refreshFlashTasks(taskNames: string[]) {
    if (taskNames.some((taskName) => taskName.includes("flash"))) {
      const flashElement = this.getElement(FLASH_ACTION);
      if (flashElement) this.refreshEvent.fire(flashElement);
    }
  }

  /**
   * Refreshes the security tasks in the actions panel based on the provided task names.
   * If any of the task names include "generate mcuboot key", it retrieves the corresponding
   * element and triggers a refresh event for it.
   *
   * @param taskNames - An array of task names to check and process.
   */
  refreshSecurityTasks(taskNames: string[]) {
    if (
      taskNames.some((taskName) =>
        taskName.includes(SECURITY_TASKS_SEARCH_STRING.generateKey),
      )
    ) {
      if (
        !this.actionItems.some(
          (item) =>
            item instanceof ActionTree && item.label === SECURITY_ACTION,
        )
      ) {
        this.actionItems.push(
          new ActionTree(
            SECURITY_ACTION,
            vscode.TreeItemCollapsibleState.Expanded,
          ),
        );
        this.refreshEvent.fire(null);
      }
      const element = this.getElement(SECURITY_ACTION);
      if (element) this.refreshEvent.fire(element);
    }
  }

  /**
   * Converts the first character of the given string to uppercase and returns the modified string.
   *
   * @param str - The string to be modified.
   * @returns The string with the first character converted to uppercase.
   */
  getDisplayName(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Utility function that checks if the input task matches the active context
   * @param task
   * @returns {boolean}
   */
  private taskMatchesActiveContext(task: vscode.Task): boolean {
    if (this.activeContext === WORKSPACE_CONTEXT) {
      return true;
    }

    if ((task.scope as vscode.WorkspaceFolder).name) {
      return (task.scope as vscode.WorkspaceFolder).name === this.activeContext;
    }

    return false;
  }

  /**
   * Initializes a file system watcher to monitor changes to tasks.json files.
   */
  private initializeFileSystemWatcher() {
    const tasksJsonWatcher =
      vscode.workspace.createFileSystemWatcher("**/tasks.json");

    tasksJsonWatcher.onDidCreate(this.handleTasksJsonChange.bind(this));
    tasksJsonWatcher.onDidChange(this.handleTasksJsonChange.bind(this));
    tasksJsonWatcher.onDidDelete(this.handleTasksJsonChange.bind(this));
  }

  /**
   * Handles changes to tasks.json files by refreshing the action items.
   */
  private handleTasksJsonChange() {
    this.refreshEvent.fire(null);
  }

  isTaskSourceJson(taskLabel: string): boolean {
    return this.localTasks?.some((task) => task.name === taskLabel) ?? false;
  }
}
