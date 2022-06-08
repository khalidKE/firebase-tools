import clccolor from "cli-color";
const { bold, underline } = clccolor;
import { Command } from "../command.js";
import { logLabeledSuccess } from "../utils.js";
import { getSite, deleteSite } from "../hosting/api.js";
import { promptOnce } from "../prompt.js";
import { FirebaseError } from "../error.js";
import { requirePermissions } from "../requirePermissions.js";
import { needProjectId } from "../projectUtils.js";
import { requireConfig } from "../requireConfig.js";
import { logger } from "../logger.js";

const LOG_TAG = "hosting:sites";

export const command = new Command("hosting:sites:delete <siteId>")
  .description("delete a Firebase Hosting site")
  .withForce()
  .before(requireConfig)
  .before(requirePermissions, ["firebasehosting.sites.delete"])
  .action(
    async (
      siteId: string,
      options: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ): Promise<void> => {
      const projectId = needProjectId(options);
      if (!siteId) {
        throw new FirebaseError("siteId is required");
      }
      logger.info(
        `Deleting a site is a permanent action. If you delete a site, Firebase doesn't maintain records of deployed files or deployment history, and the site ${underline(
          siteId
        )} cannot be reactivated by you or anyone else.`
      );
      logger.info();

      const confirmed = await promptOnce(
        {
          name: "force",
          type: "confirm",
          message: `Are you sure you want to delete the Hosting site ${underline(
            siteId
          )} for project ${underline(projectId)}? `,
          default: false,
        },
        options
      );
      if (!confirmed) {
        return;
      }

      // Check that the site exists first, to avoid giving a sucessesful message on a non-existant site.
      await getSite(projectId, siteId);
      await deleteSite(projectId, siteId);
      logLabeledSuccess(
        LOG_TAG,
        `Successfully deleted site ${bold(siteId)} from project ${bold(projectId)}`
      );
    }
  );
