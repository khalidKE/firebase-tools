import { basename } from "path";
import {
  APPHOSTING_BASE_YAML_FILE,
  APPHOSTING_LOCAL_YAML_FILE,
  discoverConfigsAtBackendRoot,
  loadConfigForEnvironment,
} from "../../apphosting/config";
import { AppHostingYamlConfig } from "../../apphosting/yaml";

/**
 * Loads in apphosting.yaml & apphosting.local.yaml, giving
 * apphosting.local.yaml precedence if present.
 */
export async function getLocalAppHostingConfiguration(
  cwd: string,
  backendRootDirectory: string,
): Promise<AppHostingYamlConfig> {
  const appHostingConfigPaths = discoverConfigsAtBackendRoot(cwd, backendRootDirectory);
  // generate a map to make it easier to interface between file name and it's path
  const fileNameToPathMap: Map<string, string> = new Map();
  for (const path of appHostingConfigPaths) {
    const fileName = basename(path);
    fileNameToPathMap.set(fileName, path);
  }

  const baseFilePath = fileNameToPathMap.get(APPHOSTING_BASE_YAML_FILE);
  const localFilePath = fileNameToPathMap.get(APPHOSTING_LOCAL_YAML_FILE);

  // apphosting.local.yaml or apphosting.yaml are not required to run the emulator
  if (!baseFilePath && !localFilePath) {
    return AppHostingYamlConfig.empty();
  }

  // If one of them exists ...
  if (!baseFilePath || !localFilePath) {
    return await AppHostingYamlConfig.loadFromFile((baseFilePath || localFilePath)!);
  }

  return await loadConfigForEnvironment(localFilePath, baseFilePath);
}
