export enum CommandErrCodes {
    Unknown = "UNKNOWN",
    InvalidValue = "INVALID_VALUE",
}

export class CommandError extends Error {
    constructor(
        error: string,
        public readonly friendlyError: string = "An issue occured when handlign your command",
        public readonly errcode: CommandErrCodes = CommandErrCodes.Unknown) {
        super(error);
    }
}