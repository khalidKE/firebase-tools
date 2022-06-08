import { Command } from "../command.js";
import { logger } from "../logger.js";
import { Options } from "../options.js";
import { needProjectId } from "../projectUtils.js";
import { accessSecretVersion } from "../gcp/secretManager.js";

export const command = new Command("functions:secrets:access <KEY>[@version]")
  .description(
    "Access secret value given secret and its version. Defaults to accessing the latest version."
  )
  .action(async (key: string, options: Options) => {
    const projectId = needProjectId(options);
    let [name, version] = key.split("@");
    if (!version) {
      version = "latest";
    }
    const value = await accessSecretVersion(projectId, name, version);
    logger.info(value);
  });
