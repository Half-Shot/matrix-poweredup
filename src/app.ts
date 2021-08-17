import { Hub, PoweredUP } from "node-poweredup";
import { MatrixBot } from "./matrix/bot";
import { CommandContext } from "./matrix/command";
import { CommandErrCodes, CommandError } from "./matrix/error";
import { Buggy, MAX_ANGLE } from "./models/Buggy";
import Logger from "./logging";
import Config from "./config";

const log = new Logger("App");
const poweredUP = new PoweredUP();

const STARTUP_TIMEOUT_MS = 30000;

async function getBuggy(): Promise<Buggy> {
    let foundBuggyCb: (buggy: Buggy) => void;
    const startupPromise = new Promise<Buggy>((res, rej) => {
        setTimeout(() => rej(new Error("Took too long to find hub")), STARTUP_TIMEOUT_MS);
        foundBuggyCb = res;
    })
    poweredUP.on("discover", async (hub: Hub) => { // Wait to discover a Hub
        log.debug(`Discovered ${hub.name}!`);
        await hub.connect(); // Connect to the Hub
        foundBuggyCb(await Buggy.fromHub(hub));
    });
    await poweredUP.scan();
    log.debug(`Scanning for hubs...`);
    const buggy = await startupPromise;
    log.debug(`Found buggy`);
    await buggy.reset();
    return buggy;
}

async function commandHandler(buggy: Buggy, ctx: CommandContext) {
    log.info(`Got command: ${ctx.name}`, ctx.data);
    let startTime = Date.now();
    if (ctx.name === "buggy_turn") {
        const turnData = ctx.data as {
            angle: number;
            direction: "left"|"right";
        };
        if (!turnData.angle && turnData.angle !== 0) {
            throw new CommandError ("Bad angle", "No angle provided", CommandErrCodes.InvalidValue);
        }
        if (!turnData.direction) {
            throw new CommandError ("Bad direction", "No direction provided", CommandErrCodes.InvalidValue);
        }
        if (turnData.angle < -MAX_ANGLE || turnData.angle > MAX_ANGLE) {
            throw new CommandError ("Angle was outside range", `Angle must be between -${MAX_ANGLE} and ${MAX_ANGLE}`, CommandErrCodes.InvalidValue);
        }
        await buggy.steer(turnData.direction, turnData.angle);
    } else if (ctx.name === "buggy_drive") {
        const driveData = ctx.data as {
            power: number;
            duration: number;
            direction: "forward"|"reverse";
        };
        driveData.power = driveData.power || 50;
        driveData.duration = driveData.duration || 1000;
        if (!driveData.direction) {
            throw new CommandError ("Bad direction", "No direction provided", CommandErrCodes.InvalidValue);
        }
        if (driveData.power < 0 || driveData.power > 100) {
            throw new CommandError ("Power was outside range", `Power must be between 0 and 100`, CommandErrCodes.InvalidValue);
        }
        if (driveData.duration < 0 || driveData.duration > 100) {
            throw new CommandError ("Power was outside range", `Duration must be between 0 and 100`, CommandErrCodes.InvalidValue);
        }
        await buggy.drive(driveData.direction, driveData.power, driveData.duration);
    } else if (ctx.name === "buggy_speed") {
        const driveData = ctx.data as {
            speed: number;
        };
        if (driveData.speed < -100 || driveData.speed > 100) {
            throw new CommandError ("Speed was outside range", `Speed must be between 0 and 100`, CommandErrCodes.InvalidValue);
        }
        await buggy.setSpeed(driveData.speed);
    }
    const sentTs = ctx.data?.ts as number|undefined;
    const serverProcessTime = sentTs && ctx.matrixEvent.timestamp - sentTs;
    const preprocessTs = startTime - ctx.matrixEvent.timestamp;
    const cmdProcessTime = Date.now() - startTime;
    const totalTime = Date.now() - (sentTs || ctx.matrixEvent.timestamp);
    log.debug(`Processing Time: total:${totalTime}ms hs:${serverProcessTime || "-"}ms pps:${preprocessTs}ms cmd:${cmdProcessTime}ms`);
}


async function main(args: string[]) {
    const config = await Config.parseConfig("./config.yaml");
    Logger.configureLogging(config.logging.level);
    const matrix = new MatrixBot(
        config.homeserver.url,
        config.homeserver.accessToken,
    );
    await matrix.init(config.homeserver.roomId);
    const buggy = await getBuggy();
    matrix.on("command", (ctx: CommandContext) => commandHandler(buggy, ctx).catch((e => ctx.errorPassthrough(e))));
}

main(process.argv).catch((ex) => {
    console.error("Failed to run:", ex);
    process.exit(1);
})