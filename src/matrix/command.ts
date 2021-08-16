import { MatrixClient, RichReply, RoomEvent } from "matrix-bot-sdk";
import { CommandError } from "./error";

export class CommandContext {
    constructor(
        public readonly name: string,
        public readonly cmd: BotCommandDefinition,
        private readonly client: MatrixClient,
        public readonly data: Record<string, unknown>|undefined,
        public readonly matrixEvent: RoomEvent<any>,
        public readonly roomId: string) {

        }

        public errorPassthrough(err: CommandError) {
            if (err instanceof CommandError) {
                this.client.sendEvent(this.roomId, "m.room.message", {
                    "msgtype": "m.notice",
                    "errcode": err.errcode,
                    ...RichReply.createFor(this.roomId, this.matrixEvent, err.friendlyError, err.friendlyError),
                })
            }
            throw err;
        }
    

}

export interface BotCommandDefinition {
    textualRegex: RegExp;
    fromText: (groups: RegExpMatchArray) => Record<string, unknown>|undefined,
    eventType?: string,
    basicCommandHandler?: (client: MatrixClient, roomId: string, event: RoomEvent<Object>) => Promise<void>,
}

export type BotCommandNames = "help"|"buggy_turn"|"buggy_drive"|"buggy_speed";

export const BotCommands: Record<BotCommandNames, BotCommandDefinition> = {
    help: {
        textualRegex: /^help$/,
        fromText: () => undefined,
        basicCommandHandler: async (client: MatrixClient, roomId: string, event: RoomEvent<Object>) => {
            await client.sendNotice(roomId, "No help yet!");
        }
    },
    // Buggy commands
    buggy_turn: {
        textualRegex: /^buggy turn (left|right) (\d+)?$/,
        eventType: "uk.half-shot.matrix-poweredup.buggy.turn",
        fromText: (groups) => ({ direction: groups[1], angle: groups[2] ?? parseInt(groups[2])}),
    },
    buggy_drive: {
        textualRegex: /^buggy drive (forward|reverse) (\d+) (\d+)$/,
        eventType: "uk.half-shot.matrix-poweredup.buggy.drive",
        fromText: (groups) => ({ direction: groups[1], power: groups[2] ?? parseInt(groups[2]), duration: groups[3] ?? parseInt(groups[3])}),
    },
    buggy_speed: {
        textualRegex: /^buggy speed (-?\d+)$/,
        eventType: "uk.half-shot.matrix-poweredup.buggy.speed",
        fromText: (groups) => ({ speed: groups[1] ?? parseInt(groups[1])}),
    }
};