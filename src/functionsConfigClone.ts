import * as _ from "lodash";
import * as clc from "cli-color";

import { FirebaseError } from "./error.js";
import * as functionsConfig from "./functionsConfig.js";
import * as runtimeconfig from "./gcp/runtimeconfig.js";

// Tests whether short is a prefix of long
function matchPrefix(short: any[], long: any[]): boolean {
  if (short.length > long.length) {
    return false;
  }
  return _.reduce(
    short,
    (accum: boolean, x, i) => {
      return accum && x === long[i];
    },
    true
  );
}

function applyExcept(json: any, except: any[]) {
  _.forEach(except, (key) => {
    _.unset(json, key);
  });
}

function cloneVariable(varName: string, toProject: any): Promise<any> {
  return runtimeconfig.variables.get(varName).then((variable) => {
    const id = functionsConfig.varNameToIds(variable.name);
    return runtimeconfig.variables.set(toProject, id.config, id.variable, variable.text);
  });
}

function cloneConfig(configName: string, toProject: any): Promise<any> {
  return runtimeconfig.variables.list(configName).then((variables) => {
    return Promise.all(
      _.map(variables, (variable) => {
        return cloneVariable(variable.name, toProject);
      })
    );
  });
}

async function cloneConfigOrVariable(key: string, fromProject: any, toProject: any): Promise<any> {
  const parts = key.split(".");
  if (_.includes(functionsConfig.RESERVED_NAMESPACES, parts[0])) {
    throw new FirebaseError("Cannot clone reserved namespace " + clc.bold(parts[0]));
  }
  const configName = _.join(["projects", fromProject, "configs", parts[0]], "/");
  if (parts.length === 1) {
    return cloneConfig(configName, toProject);
  }
  return runtimeconfig.variables.list(configName).then((variables) => {
    const promises: Promise<any>[] = [];
    _.forEach(variables, (variable) => {
      const varId = functionsConfig.varNameToIds(variable.name).variable;
      const variablePrefixFilter = parts.slice(1);
      if (matchPrefix(variablePrefixFilter, varId.split("/"))) {
        promises.push(cloneVariable(variable.name, toProject));
      }
    });
    return Promise.all(promises);
  });
}

export async function functionsConfigClone(
  fromProject: any,
  toProject: any,
  only: string[] | undefined,
  except: string[] = []
): Promise<any> {
  if (only) {
    return Promise.all(
      _.map(only, (key) => {
        return cloneConfigOrVariable(key, fromProject, toProject);
      })
    );
  }
  return functionsConfig.materializeAll(fromProject).then((toClone) => {
    _.unset(toClone, "firebase"); // Do not clone firebase config
    applyExcept(toClone, except);
    return Promise.all(
      _.map(toClone, (val, configId) => {
        return functionsConfig.setVariablesRecursive(toProject, configId, "", val);
      })
    );
  });
}
