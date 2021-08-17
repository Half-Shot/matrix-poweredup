import YAML from "yaml";
import fs from "fs/promises";

interface BridgeConfigHomeserver {
    url: string;
    accessToken: string;
    roomId: string;
}

interface BridgeConfigLogging {
    level: string;
}

interface BridgeConfigRoot {
    homeserver: BridgeConfigHomeserver;
    logging: BridgeConfigLogging;
}

export default class Config {
    public readonly homeserver: BridgeConfigHomeserver;
    public readonly logging: BridgeConfigLogging;

    constructor(configData: BridgeConfigRoot) {
        this.homeserver = configData.homeserver;
        this.logging = configData.logging || {
            level: "info",
        }
    }

    static async parseConfig(filename: string): Promise<Config> {
        const file = await fs.readFile(filename, "utf-8");
        return new Config(YAML.parse(file));
    }
}