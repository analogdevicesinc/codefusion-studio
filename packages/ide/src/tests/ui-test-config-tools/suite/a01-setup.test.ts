import { describe, before } from "mocha";
import * as path from "path";
import {
  By,
  EditorView,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

describe("Setup test environment", function () {
  before(async function () {
    this.timeout(60000);

    const editorView = new EditorView();

    await editorView.closeAllEditors();
  });

  it("should dismiss toast notifications", async function () {
    this.timeout(60000);

    const browser = VSBrowser.instance;
    const view = new WebView();

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp.cfsconfig",
      ),
    );

    await view.wait();

    await view.switchBack();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await new Workbench().getNotifications().then(async (notifications) => {
      await Promise.all(
        notifications.map(
          (notification) =>
            new Promise((resolve) => {
              notification.dismiss().then(() => {
                resolve("closed");
              });
            }),
        ),
      );

      try {
        // Try to find the element with a short timeout
        const cExtensionToast = await browser.driver
          .findElement(
            By.xpath('//*[@id="list_id_1_0"]/div[1]/div[1]/div[2]/a[2]'),
          )
          .catch(() => null);

        // If the element exists, click it
        if (cExtensionToast) {
          await cExtensionToast.click();
          console.log("C Extension toast dismissed");
        } else {
          console.log("No C Extension toast found");
        }
      } catch (error) {
        // Element not found or other error
        console.log("No C Extension toast to dismiss");
      }
    });
  });
});
