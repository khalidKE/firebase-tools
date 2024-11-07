import * as path from "path";
import * as utils from "./utils";

import * as sinon from "sinon";
import { expect } from "chai";
import { getLocalAppHostingConfiguration } from "./config";
import * as configImport from "../../apphosting/config";
import { AppHostingYamlConfig } from "../../apphosting/yaml";

describe("environments", () => {
  let joinStub: sinon.SinonStub;
  let loggerStub: sinon.SinonStub;
  let loadAppHostingYamlStub: sinon.SinonStub;
  let discoverConfigsAtBackendRoot: sinon.SinonStub;

  // Configs used for stubs
  const apphostingYamlConfigOne = AppHostingYamlConfig.empty();
  apphostingYamlConfigOne.addEnvironmentVariable({
    variable: "randomEnvOne",
    value: "envOne",
  });
  apphostingYamlConfigOne.addEnvironmentVariable({
    variable: "randomEnvTwo",
    value: "envTwo",
  });
  apphostingYamlConfigOne.addEnvironmentVariable({
    variable: "randomEnvThree",
    value: "envThree",
  });
  apphostingYamlConfigOne.addSecret({ variable: "randomSecretOne", secret: "secretOne" });
  apphostingYamlConfigOne.addSecret({ variable: "randomSecretTwo", secret: "secretTwo" });
  apphostingYamlConfigOne.addSecret({ variable: "randomSecretThree", secret: "secretThree" });

  const apphostingYamlConfigTwo = AppHostingYamlConfig.empty();
  apphostingYamlConfigTwo.addEnvironmentVariable({
    variable: "randomEnvOne",
    value: "envOne",
  });
  apphostingYamlConfigTwo.addEnvironmentVariable({
    variable: "randomEnvTwo",
    value: "blah",
  });
  apphostingYamlConfigTwo.addEnvironmentVariable({
    variable: "randomEnvFour",
    value: "envFour",
  });
  apphostingYamlConfigTwo.addSecret({ variable: "randomSecretOne", secret: "bleh" });
  apphostingYamlConfigTwo.addSecret({ variable: "randomSecretTwo", secret: "secretTwo" });
  apphostingYamlConfigTwo.addSecret({ variable: "randomSecretFour", secret: "secretFour" });

  beforeEach(() => {
    loadAppHostingYamlStub = sinon.stub(AppHostingYamlConfig, "loadFromFile");
    joinStub = sinon.stub(path, "join");
    loggerStub = sinon.stub(utils, "logger");
    discoverConfigsAtBackendRoot = sinon.stub(configImport, "discoverConfigsAtBackendRoot");
  });

  afterEach(() => {
    joinStub.restore();
    loggerStub.restore();
    sinon.verifyAndRestore();
  });

  describe("getLocalAppHostingConfiguration", () => {
    it("should return an empty config if no base or local apphosting yaml files found", async () => {
      discoverConfigsAtBackendRoot.returns([]);

      const apphostingConfig = await getLocalAppHostingConfiguration("test", "./");
      expect(JSON.stringify(apphostingConfig.environmentVariables)).to.equal(JSON.stringify([]));
      expect(JSON.stringify(apphostingConfig.secrets)).to.equal(JSON.stringify([]));
    });

    it("should return local config if only local config found", async () => {
      discoverConfigsAtBackendRoot.returns(["/parent/apphosting.local.yaml"]);
      loadAppHostingYamlStub.onFirstCall().returns(apphostingYamlConfigOne);

      const apphostingConfig = await getLocalAppHostingConfiguration("test", "./");

      expect(JSON.stringify(apphostingConfig.environmentVariables)).to.equal(
        JSON.stringify([
          { variable: "randomEnvOne", value: "envOne" },
          { variable: "randomEnvTwo", value: "envTwo" },
          { variable: "randomEnvThree", value: "envThree" },
        ]),
      );

      expect(JSON.stringify(apphostingConfig.secrets)).to.equal(
        JSON.stringify([
          { variable: "randomSecretOne", secret: "secretOne" },
          { variable: "randomSecretTwo", secret: "secretTwo" },
          { variable: "randomSecretThree", secret: "secretThree" },
        ]),
      );
    });

    it("should return base config if only base config found", async () => {
      discoverConfigsAtBackendRoot.returns(["/parent/apphosting.yaml"]);
      loadAppHostingYamlStub.onFirstCall().returns(apphostingYamlConfigOne);

      const apphostingConfig = await getLocalAppHostingConfiguration("test", "./");

      expect(JSON.stringify(apphostingConfig.environmentVariables)).to.equal(
        JSON.stringify([
          { variable: "randomEnvOne", value: "envOne" },
          { variable: "randomEnvTwo", value: "envTwo" },
          { variable: "randomEnvThree", value: "envThree" },
        ]),
      );

      expect(JSON.stringify(apphostingConfig.secrets)).to.equal(
        JSON.stringify([
          { variable: "randomSecretOne", secret: "secretOne" },
          { variable: "randomSecretTwo", secret: "secretTwo" },
          { variable: "randomSecretThree", secret: "secretThree" },
        ]),
      );
    });

    it("should combine apphosting yaml files according to precedence", async () => {
      discoverConfigsAtBackendRoot.returns([
        "/parent/cwd/apphosting.yaml",
        "/parent/apphosting.local.yaml",
      ]);

      // Second config takes precedence
      loadAppHostingYamlStub.onFirstCall().returns(apphostingYamlConfigTwo);
      loadAppHostingYamlStub.onSecondCall().returns(apphostingYamlConfigOne);

      const apphostingConfig = await getLocalAppHostingConfiguration("test", "./");

      expect(JSON.stringify(apphostingConfig.environmentVariables)).to.equal(
        JSON.stringify([
          { variable: "randomEnvOne", value: "envOne" },
          { variable: "randomEnvTwo", value: "blah" },
          { variable: "randomEnvThree", value: "envThree" },
          { variable: "randomEnvFour", value: "envFour" },
        ]),
      );

      expect(JSON.stringify(apphostingConfig.secrets)).to.equal(
        JSON.stringify([
          { variable: "randomSecretOne", secret: "bleh" },
          { variable: "randomSecretTwo", secret: "secretTwo" },
          { variable: "randomSecretThree", secret: "secretThree" },
          { variable: "randomSecretFour", secret: "secretFour" },
        ]),
      );
    });
  });
});
