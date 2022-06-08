import * as clc from "cli-color";

import { Command } from "../command.js";
import { FirebaseError } from "../error.js";
import { logger } from "../logger.js";
import * as auth from "../auth.js";
import * as utils from "../utils.js";

export const command = new Command("login:ci")
  .description("generate an access token for use in non-interactive environments")
  .option(
    "--no-localhost",
    "copy and paste a code instead of starting a local server for authentication"
  )
  .action(async (options) => {
    if (options.nonInteractive) {
      throw new FirebaseError("Cannot run login:ci in non-interactive mode.");
    }

    const userCredentials = await auth.loginGoogle(options.localhost);
    logger.info();
    utils.logSuccess(
      "Success! Use this token to login on a CI server:\n\n" +
        clc.bold(userCredentials.tokens.refresh_token) +
        '\n\nExample: firebase deploy --token "$FIREBASE_TOKEN"\n'
    );
    return userCredentials;
  });
