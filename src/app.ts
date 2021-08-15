import { Hub, PoweredUP } from "node-poweredup";
import { Buggy } from "./models/Buggy";
const poweredUP = new PoweredUP();

async function main(args: string[]) {
    let foundBuggyCb: (buggy: Buggy) => void;
    const startupPromise = new Promise<Buggy>((res, rej) => {
        setTimeout(() => rej(new Error("Took too long to find hub")), 30000);
        foundBuggyCb = res;
    })
    poweredUP.on("discover", async (hub: Hub) => { // Wait to discover a Hub
        console.log(`Discovered ${hub.name}!`);
        await hub.connect(); // Connect to the Hub
        foundBuggyCb(await Buggy.fromHub(hub));
    });
    await poweredUP.scan();
    console.log(`Scanning for hubs`);
    const buggy = await startupPromise;
    console.log(`Found buggy`);
    await buggy.reset();
    for (let i = 0; i < 100; i += 5) {
        await buggy.drive("forward", i);
    }
    // console.log("Steering right");
    // for (let i = 1; i < 16; i++) {
    //     await buggy.steer("right", 2);
    //     await buggy.sleep(500);
    //     console.log("Steered ", i * 2);
    // }
    // console.log("Steering left");
    // for (let i = 1; i < 16; i++) {
    //     await buggy.steer("left", 2);
    //     await buggy.sleep(500);
    //     console.log("Steered ", i * 2);
    // }
}


main(process.argv).catch((ex) => {
    console.error("Failed to run:", ex);
    process.exit(1);
})