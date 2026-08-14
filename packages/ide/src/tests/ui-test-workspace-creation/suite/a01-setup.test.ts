import { describe, before } from "mocha";
import * as path from "path";
import { By, EditorView, VSBrowser, Workbench } from "vscode-extension-tester";

let workbench: Workbench;

describe("Setup test environment", () => {
  before(async function () {
    this.timeout(60000);

    const editorView = new EditorView();
    workbench = new Workbench();

    console.log(
      `Closing ${(await editorView.getOpenEditorTitles()).toString()}`,
    );

    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  it("should dismiss toast notifications @smoke", async function () {
    this.timeout(60000);

    const browser = VSBrowser.instance;

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );

    console.log(
      `Dismissing notifications: ${(await workbench.getNotifications()).toString()}`,
    );

    await workbench.getNotifications().then(async (notifications) => {
      await Promise.all(
        notifications.map(async (notification) => {
          await new Promise((resolve) => {
            notification.dismiss().then(() => {
              resolve("closed");
            });
          });
        }),
      );
    });

    try {
      const cExtensionToast = await browser.driver.findElement(
        By.xpath('//*[@id="list_id_1_0"]/div[1]/div[1]/div[2]/a[2]'),
      );

      // Dismisses the c extension toast notification
      if (cExtensionToast) {
        await cExtensionToast.click();
        console.log("C Extension toast dismissed");
      } else {
        console.log("No C Extension toast found");
      }
    } catch (_) {
      console.log("No C Extension toast to dismiss");
    } finally {
      await new Workbench().executeCommand("workbench.action.closeAllEditors");
    }
  });
});
