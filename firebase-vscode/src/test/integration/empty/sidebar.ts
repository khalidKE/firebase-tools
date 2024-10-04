import { FirebaseCommands } from "../../utils/page_objects/commands";
import { FirebaseSidebar } from "../../utils/page_objects/sidebar";
import { firebaseSuite, firebaseTest } from "../../utils/test_hooks";

firebaseSuite("Supports opening empty projects", async function () {
  firebaseTest("opens an empty project", async function () {
    const workbench = await browser.getWorkbench();

    const sidebar = new FirebaseSidebar(workbench);
    await sidebar.openExtensionSidebar();

    const commands = new FirebaseCommands();
    await commands.waitForUser();

    await sidebar.runInStudioContext(async (firebase) => {
      await firebase.signInWithGoogleLink.waitForExist();
      await firebase.signInWithGoogleLink.waitForDisplayed();

      expect(await firebase.signInWithGoogleLink.getText()).toBe(
        "Sign in with Google",
      );
    });
  });
});
