import * as apphosting from "../gcp/apphosting";
import { Command } from "../command";
import { Options } from "../options";
import { needProjectId } from "../projectUtils";
import { FirebaseError } from "../error";
import { doSetup } from "../apphosting/rollout";

export const command = new Command("apphosting:rollouts:create <backendId>")
  .description("create a rollout using a build for an App Hosting backend")
  .option("-l, --location <location>", "specify the region of the backend", "us-central1")
  .option("-i, --id <rolloutId>", "id of the rollout (defaults to autogenerating a random id)", "")
  .option(
    "-gb, --git-branch <gitBranch>",
    "repository branch to deploy (mutually exclusive with -gc)",
  )
  .option("-gc, --git-commit <gitCommit>", "git commit to deploy (mutually exclusive with -gb)")
  .withForce("Skip confirmation before creating rollout")
  .before(apphosting.ensureApiEnabled)
  .action(async (backendId: string, options: Options) => {
    const projectId = needProjectId(options);
    const location = options.location as string;

    const branch = options.gitBranch as string | undefined;
    const commit = options.gitCommit as string | undefined;
    if (branch && commit) {
      throw new FirebaseError(
        "Cannot specify both a branch and commit to deploy. Please specify either --git-branch or --commit.",
      );
    }

    await doSetup(backendId, projectId, location, branch, commit, options.force);
  });
