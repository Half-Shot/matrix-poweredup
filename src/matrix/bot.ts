import EventEmitter from "events";
import { MatrixClient, MessageEvent, RoomEvent, SimpleFsStorageProvider } from "matrix-bot-sdk";
import { BotCommandDefinition, BotCommands, CommandContext } from "./command";

export class MatrixBot extends EventEmitter {
    private client: MatrixClient;
    constructor(url: string, token: string) {
        super();
        this.client = new MatrixClient(url, token, new SimpleFsStorageProvider("./client-data.json"));
        this.client.on("room.event", this.onRoomEvent.bind(this));
    }

    public async init(ensureJoinedToRoom: string) {
        const rooms = await this.client.getJoinedRooms();
        if (!rooms.includes(ensureJoinedToRoom)) {
            console.log(`Not joined to ${ensureJoinedToRoom}, joining`);
            await this.client.joinRoom(ensureJoinedToRoom);
            console.log(`Joined to ${ensureJoinedToRoom}`);
        }
        await this.client.start();
    }

    private async onRoomEvent(roomId: string, eventData: unknown) {
        const event = new RoomEvent(eventData);
        if ((event.unsigned?.age || 0) > 30000) {
            console.log(`${event.eventId} was too old`);
            // Event too old.
            return;
        }
        if (event.raw.state_key) { 
            console.log(`${event.eventId} had a state key`);
            // Ignore state events.
            return;
        }
        if (event.type === "m.room.message") {
            await this.onRoomMessage(roomId, eventData);
            return;
        }
        const cmd = Object.entries(BotCommands).find(c => c[1].eventType === event.type);
        if (cmd) {
            this.emit("command", new CommandContext(cmd[0], cmd[1], this.client, event.content as Record<string, unknown>, event, roomId));
        }
    }

    private async onRoomMessage(roomId: string, eventData: unknown) {
        const event = new MessageEvent(eventData);
        console.log(`Got message ${event.eventId}`);
        // Check commands
        let command: BotCommandDefinition|undefined;
        let commandName: string|undefined;
        let data;
        if (event.textBody) {
            for (const [name, cmd] of Object.entries(BotCommands)) {
                let textualMatchResult = cmd.textualRegex.exec(event.textBody);
                if (textualMatchResult) {
                    commandName = name;
                    command = cmd;
                    data = cmd.fromText(textualMatchResult);
                    break;
                }
            }
        }
        if (!command || !commandName) {
            console.log("Command not understood");
            return;
        }
        this.emit("command", new CommandContext(commandName, command, this.client, data, event, roomId));
        if (command.basicCommandHandler) {
            await command.basicCommandHandler(this.client, roomId, event);
        }
    }
}