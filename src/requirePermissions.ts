import clccolor from "cli-color";
const { bold } = clccolor;
import { getProjectId } from "./projectUtils.js";
import { requireAuth } from "./requireAuth.js";
import { logger } from "./logger.js";
import { FirebaseError } from "./error.js";
import { testIamPermissions } from "./gcp/iam.js";

// Permissions required for all commands.
const BASE_PERMISSIONS = ["firebase.projects.get"];

/**
 * Before filter that verifies authentication and performs informational IAM permissions check.
 *
 * @param options The command-wide options object.
 * @param permissions A list of IAM permissions to require.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requirePermissions(options: any, permissions: string[] = []): Promise<void> {
  const projectId = getProjectId(options);
  if (!projectId) {
    return;
  }
  const requiredPermissions = BASE_PERMISSIONS.concat(permissions).sort();

  await requireAuth(options);

  logger.debug(
    `[iam] checking project ${projectId} for permissions ${JSON.stringify(requiredPermissions)}`
  );

  try {
    const iamResult = await testIamPermissions(projectId, requiredPermissions);
    if (!iamResult.passed) {
      throw new FirebaseError(
        `Authorization failed. This account is missing the following required permissions on project ${bold(
          projectId
        )}:\n\n  ${iamResult.missing.join("\n  ")}`
      );
    }
  } catch (err: any) {
    logger.debug(`[iam] error while checking permissions, command may fail: ${err}`);
    return;
  }
}
