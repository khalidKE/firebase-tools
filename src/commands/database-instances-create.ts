import { Command } from "../command.js";
import { logger } from "../logger.js";
import { requirePermissions } from "../requirePermissions.js";
import { warnEmulatorNotSupported } from "../emulator/commandUtils.js";
import { Emulators } from "../emulator/types.js";
import {
  createInstance,
  DatabaseInstanceType,
  DatabaseLocation,
  parseDatabaseLocation,
} from "../management/database";
import { needProjectId } from "../projectUtils.js";
import { getDefaultDatabaseInstance } from "../getDefaultDatabaseInstance.js";
import { FirebaseError } from "../error.js";
import { MISSING_DEFAULT_INSTANCE_ERROR_MESSAGE } from "../requireDatabaseInstance.js";

export const command = new Command("database:instances:create <instanceName>")
  .description("create a realtime database instance")
  .option(
    "-l, --location <location>",
    "(optional) location for the database instance, defaults to us-central1"
  )
  .before(requirePermissions, ["firebasedatabase.instances.create"])
  .before(warnEmulatorNotSupported, Emulators.DATABASE)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .action(async (instanceName: string, options: any) => {
    const projectId = needProjectId(options);
    const defaultDatabaseInstance = await getDefaultDatabaseInstance({ project: projectId });
    if (defaultDatabaseInstance === "") {
      throw new FirebaseError(MISSING_DEFAULT_INSTANCE_ERROR_MESSAGE);
    }
    const location = parseDatabaseLocation(options.location, DatabaseLocation.US_CENTRAL1);
    const instance = await createInstance(
      projectId,
      instanceName,
      location,
      DatabaseInstanceType.USER_DATABASE
    );
    logger.info(`created database instance ${instance.name}`);
    return instance;
  });
