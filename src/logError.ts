import { logger } from "./logger.js";
import * as clc from "cli-color";

/* istanbul ignore next */
export function logError(error: any): void {
  if (error.children && error.children.length) {
    logger.error(clc.bold.red("Error:"), clc.underline(error.message) + ":");
    error.children.forEach((child: any) => {
      let out = "- ";
      if (child.name) {
        out += clc.bold(child.name) + " ";
      }
      out += child.message;

      logger.error(out);
    });
  } else {
    if (error.original) {
      logger.debug(error.original.stack);
    }
    logger.error();
    logger.error(clc.bold.red("Error:"), error.message);
  }
  if (error.context) {
    logger.debug("Error Context:", JSON.stringify(error.context, undefined, 2));
  }
}
