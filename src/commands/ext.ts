import * as _ from "lodash";
import * as clc from "cli-color";

import { checkMinRequiredVersion } from "../checkMinRequiredVersion.js";
import { Command } from "../command.js";
import { needProjectId } from "../projectUtils.js";
import { logPrefix } from "../extensions/extensionsHelper.js";
import { listExtensions } from "../extensions/listExtensions.js";
import { requirePermissions } from "../requirePermissions.js";
import { logger } from "../logger.js";
import * as utils from "../utils.js";
import { CommanderStatic } from "commander";

export const command = new Command("ext")
  .description(
    "display information on how to use ext commands and extensions installed to your project"
  )
  .before(checkMinRequiredVersion, "extMinVersion")
  .action(async (options: any) => {
    // Print out help info for all extensions commands.
    utils.logLabeledBullet(logPrefix, "list of extensions commands:");
    const firebaseTools = require("../"); // eslint-disable-line @typescript-eslint/no-var-requires
    const commandNames = [
      "ext:install",
      "ext:info",
      "ext:list",
      "ext:configure",
      "ext:update",
      "ext:uninstall",
    ];

    _.forEach(commandNames, (commandName) => {
      const command: CommanderStatic = firebaseTools.getCommand(commandName);
      logger.info(clc.bold("\n" + command.name()));
      command.outputHelp();
    });
    logger.info();

    // Print out a list of all extension instances on project, if called with a project.
    try {
      await requirePermissions(options, ["firebaseextensions.instances.list"]);
      const projectId = needProjectId(options);
      return listExtensions(projectId);
    } catch (err: any) {
      return;
    }
  });
