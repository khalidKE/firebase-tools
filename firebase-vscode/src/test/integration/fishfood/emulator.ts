import { firebaseTest } from "../../utils/test_hooks";
import { FirebaseCommands } from "../../utils/page_objects/commands";
import { FirebaseSidebar } from "../../utils/page_objects/sidebar";
import { mockUser } from "../../utils/user";
import { mockProject } from "../../utils/projects";

firebaseTest("Emulators", async function () {
  it("Clicking on `Start emulators` reflects the task state in the sidebar", async function () {
    const workbench = await browser.getWorkbench();

    const sidebar = new FirebaseSidebar(workbench);
    const commands = new FirebaseCommands();

    await sidebar.openExtensionSidebar();
    await commands.waitForUser();

    await mockUser({ email: "test@gmail.com" });
    await mockProject("test-project");

    await sidebar.startEmulators();
    await commands.waitForEmulators();

    const current = await sidebar.currentEmulators();

    expect(current).toContain("dataconnect :9399");
  });
});
