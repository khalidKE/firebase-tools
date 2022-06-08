import * as _ from "lodash";
import * as clc from "cli-color";
import * as path from "path";

import { FirebaseError } from "../../error.js";
import { parseBoltRules } from "../../parseBoltRules.js";
import * as rtdb from "../../rtdb.js";
import * as utils from "../../utils.js";
import { Options } from "../../options.js";
import * as dbRulesConfig from "../../database/rulesConfig.js";

export function prepare(context: any, options: Options): Promise<any> {
  const rulesConfig = dbRulesConfig.getRulesConfig(context.projectId, options);
  const next = Promise.resolve();

  if (!rulesConfig || rulesConfig.length === 0) {
    return next;
  }

  const ruleFiles: Record<string, any> = {};
  const deploys: any[] = [];

  rulesConfig.forEach((ruleConfig: any) => {
    if (!ruleConfig.rules) {
      return;
    }

    ruleFiles[ruleConfig.rules] = null;
    deploys.push(ruleConfig);
  });

  _.forEach(ruleFiles, (v, file) => {
    switch (path.extname(file)) {
      case ".json":
        ruleFiles[file] = options.config.readProjectFile(file);
        break;
      case ".bolt":
        ruleFiles[file] = parseBoltRules(file);
        break;
      default:
        throw new FirebaseError("Unexpected rules format " + path.extname(file));
    }
  });

  context.database = {
    deploys: deploys,
    ruleFiles: ruleFiles,
  };
  utils.logBullet(clc.bold.cyan("database: ") + "checking rules syntax...");
  return Promise.all(
    deploys.map((deploy) => {
      return rtdb
        .updateRules(context.projectId, deploy.instance, ruleFiles[deploy.rules], { dryRun: true })
        .then(() => {
          utils.logSuccess(
            clc.bold.green("database: ") +
              "rules syntax for database " +
              clc.bold(deploy.instance) +
              " is valid"
          );
        });
    })
  );
}
