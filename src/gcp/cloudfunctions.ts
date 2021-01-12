import * as _ from "lodash";
import * as clc from "cli-color";

import * as api from "../api";
import { FirebaseError } from "../error";
import * as logger from "../logger";
import * as utils from "../utils";

// TODO: TS module weirdness prevented me from putting Operation in gcp/cloudfunctions.ts. Find a cleaner place to put this/get rid of it when switching to poller.
import { CloudFunction, Operation } from "../deploy/functions/release";

const API_VERSION = "v1";

/**
 * Logs an error from a failed function deployment.
 * @param funcName Name of the function that was unsuccessfully deployed.
 * @param type Type of deployment - create, update, or delete.
 * @param err The error returned from the operation.
 */
function functionsOpLogReject(funcName: string, type: string, err: any): void {
  utils.logWarning(clc.bold.yellow("functions:") + " failed to " + type + " function " + funcName);
  if (err?.context?.response?.statusCode === 429) {
    logger.debug(err.message);
    logger.info(
      "You have exceeded your deployment quota, please deploy your functions in batches by using the --only flag, " +
        "and wait a few minutes before deploying again. Go to https://firebase.google.com/docs/cli/#partial_deploys to learn more."
    );
  } else {
    logger.info(err.message);
  }
  throw new FirebaseError(`Failed to ${type} function ${funcName}`, {
    original: err,
    context: { function: funcName },
  });
}

/**
 * Calls the GCG API to generate a signed upload URL that
 * function code can be uploaded to.
 * @param projectId The ID of the project being deployed to.
 * @param location The region to used for generating an upload URL.
 */
export async function generateUploadUrl(projectId: string, location: string): Promise<string> {
  const parent = "projects/" + projectId + "/locations/" + location;
  const endpoint = "/" + API_VERSION + "/" + parent + "/functions:generateUploadUrl";

  try {
    const res = await api.request("POST", endpoint, {
      auth: true,
      json: false,
      origin: api.functionsOrigin,
      retryCodes: [503],
    });
    const responseBody = JSON.parse(res.body);
    return responseBody.uploadUrl;
  } catch (err) {
    logger.info(
      "\n\nThere was an issue deploying your functions. Verify that your project has a Google App Engine instance setup at https://console.cloud.google.com/appengine and try again. If this issue persists, please contact support."
    );
    throw err;
  }
}

/**
 * Create a Cloud Function.
 * @param options The function to deploy.
 */
export async function createFunction(options: any): Promise<Operation> {
  const location = "projects/" + options.projectId + "/locations/" + options.region;
  const fullFuncName = location + "/functions/" + options.functionName;
  const endpoint = "/" + API_VERSION + "/" + location + "/functions";

  const data: CloudFunction = {
    sourceUploadUrl: options.sourceUploadUrl,
    name: fullFuncName,
    entryPoint: options.entryPoint,
    labels: options.labels,
    runtime: options.runtime,
  };

  if (options.vpcConnector) {
    data.vpcConnector = options.vpcConnector;
    // use implied project/location if only given connector id
    if (!data.vpcConnector?.includes("/")) {
      data.vpcConnector = `${location}/connectors/${data.vpcConnector}`;
    }
  }
  if (options.vpcConnectorEgressSettings) {
    data.vpcConnectorEgressSettings = options.vpcConnectorEgressSettings;
  }
  if (options.availableMemoryMb) {
    data.availableMemoryMb = options.availableMemoryMb;
  }
  if (options.timeout) {
    data.timeout = options.timeout;
  }
  if (options.maxInstances) {
    data.maxInstances = Number(options.maxInstances);
  }
  if (options.environmentVariables) {
    data.environmentVariables = options.environmentVariables;
  }
  if (options.serviceAccountEmail) {
    data.serviceAccountEmail = options.serviceAccountEmail;
  }
  try {
    const res = await api.request("POST", endpoint, {
      auth: true,
      data: _.assign(data, options.trigger),
      origin: api.functionsOrigin,
    });
    return {
      name: res.body.name,
      type: "create",
      funcName: fullFuncName,
      eventType: options.eventType,
      done: false,
    };
  } catch (err) {
    throw functionsOpLogReject(options.functionName, "create", err);
  }
}

/**
 * @param projectId Project that owns the Function.
 * @param region Region in which the Function exists.
 * @param functionName Name of the Function.
 * @param policy The [policy](https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/setIamPolicy) to set.
 */
interface IamOptions {
  projectId: string;
  region: string;
  functionName: string;
  policy: any; // TODO: Type this?
}

/**
 * Sets the IAM policy of a Google Cloud Function.
 * @param options The Iam options to set.
 */
export async function setIamPolicy(options: IamOptions) {
  const name = `projects/${options.projectId}/locations/${options.region}/functions/${options.functionName}`;
  const endpoint = `/${API_VERSION}/${name}:setIamPolicy`;

  try {
    await api.request("POST", endpoint, {
      auth: true,
      data: {
        policy: options.policy,
        updateMask: Object.keys(options.policy).join(","),
      },
      origin: api.functionsOrigin,
    });
  } catch (err) {
    throw new FirebaseError(
      `Failed to set the IAM Policy on the function ${options.functionName}`,
      { original: err }
    );
  }
}

/**
 * Updates a Cloud Function.
 * @param options The Cloud Function to update.
 */
export async function updateFunction(options: any): Promise<Operation> {
  const location = "projects/" + options.projectId + "/locations/" + options.region;
  const fullFuncName = location + "/functions/" + options.functionName;
  const endpoint = "/" + API_VERSION + "/" + fullFuncName;

  const data: CloudFunction = _.assign(
    {
      sourceUploadUrl: options.sourceUploadUrl,
      name: fullFuncName,
      labels: options.labels,
    },
    options.trigger
  );
  let masks = ["sourceUploadUrl", "name", "labels"];

  if (options.vpcConnector) {
    data.vpcConnector = options.vpcConnector;
    // use implied project/location if only given connector id
    if (!data.vpcConnector?.includes("/")) {
      data.vpcConnector = `${location}/connectors/${data.vpcConnector}`;
    }
    masks.push("vpcConnector");
  }
  if (options.vpcConnectorEgressSettings) {
    data.vpcConnectorEgressSettings = options.vpcConnectorEgressSettings;
    masks.push("vpcConnectorEgressSettings");
  }
  if (options.runtime) {
    data.runtime = options.runtime;
    masks = _.concat(masks, "runtime");
  }
  if (options.availableMemoryMb) {
    data.availableMemoryMb = options.availableMemoryMb;
    masks.push("availableMemoryMb");
  }
  if (options.timeout) {
    data.timeout = options.timeout;
    masks.push("timeout");
  }
  if (options.maxInstances) {
    data.maxInstances = Number(options.maxInstances);
    masks.push("maxInstances");
  }
  if (options.environmentVariables) {
    data.environmentVariables = options.environmentVariables;
    masks.push("environmentVariables");
  }
  if (options.serviceAccountEmail) {
    data.serviceAccountEmail = options.serviceAccountEmail;
    masks.push("serviceAccountEmail");
  }
  if (options.trigger.eventTrigger) {
    masks = _.concat(
      masks,
      _.map(_.keys(options.trigger.eventTrigger), (subkey) => {
        return "eventTrigger." + subkey;
      })
    );
  } else {
    masks = _.concat(masks, "httpsTrigger");
  }

  try {
    const res = await api.request("PATCH", endpoint, {
      qs: {
        updateMask: masks.join(","),
      },
      auth: true,
      data: data,
      origin: api.functionsOrigin,
    });
    return {
      funcName: fullFuncName,
      eventType: options.eventType,
      done: false,
      name: res.body.name,
      type: "update",
    };
  } catch (err) {
    throw functionsOpLogReject(options.functionName, "update", err);
  }
}

/**
 * Delete a Cloud Function.
 * @param options the Cloud Function to delete.
 */
export async function deleteFunction(options: any): Promise<Operation> {
  const location = "projects/" + options.projectId + "/locations/" + options.region;
  const fullFuncName = location + "/functions/" + options.functionName;
  const endpoint = "/" + API_VERSION + "/" + fullFuncName;
  try {
    const res = await api.request("DELETE", endpoint, {
      auth: true,
      origin: api.functionsOrigin,
    });
    return {
      funcName: fullFuncName,
      eventType: options.eventType,
      done: false,
      name: res.body.name,
      type: "delete",
    };
  } catch (err) {
    throw functionsOpLogReject(options.functionName, "delete", err);
  }
}

/**
 * List all existing Cloud Functions in a project and region.
 * @param projectId the Id of the project to check.
 * @param region the region to check in.
 */
export async function listFunctions(projectId: string, region: string): Promise<any[]> {
  // TODO: type this
  const endpoint =
    "/" + API_VERSION + "/projects/" + projectId + "/locations/" + region + "/functions";
  try {
    const res = await api.request("GET", endpoint, {
      auth: true,
      origin: api.functionsOrigin,
    });
    if (res.body.unreachable && res.body.unreachable.length > 0) {
      throw new FirebaseError(
        "Some Cloud Functions regions were unreachable, please try again later.",
        { exit: 2 }
      );
    }

    const functionsList = res.body.functions || [];
    _.forEach(functionsList, (f) => {
      f.functionName = f.name.substring(f.name.lastIndexOf("/") + 1);
    });
    return functionsList;
  } catch (err) {
    logger.debug("[functions] failed to list functions for " + projectId);
    logger.debug("[functions] " + err.message);
    return Promise.reject(err.message);
  }
}

/**
 * List all existing Cloud Functions in a project.
 * @param projectId the Id of the project to check.
 */
export async function listAllFunctions(projectId: string) {
  // "-" instead of a region string lists functions in all regions
  return listFunctions(projectId, "-");
}

/**
 * Checks if an Operation has completed.
 * @param operation The Operation to check.
 */
export async function checkOperation(operation: Operation) {
  const res = await api.request("GET", "/" + API_VERSION + "/" + operation.name, {
    auth: true,
    origin: api.functionsOrigin,
  });
  try {
    if (res.body.done) {
      operation.done = true;
    }
    if (_.has(res.body, "error")) {
      operation.error = res.body.error;
    }
    return operation;
  } catch (err) {
    logger.debug("[functions] failed to get status of operation: " + operation.name);
    logger.debug("[functions] " + err.message);
    operation.error = err;
    throw new FirebaseError(err.message);
  }
}
