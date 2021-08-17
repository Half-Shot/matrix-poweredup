// Logging makes heavy use of any
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogService } from "matrix-bot-sdk";
import util from "util";
import winston, { Logger } from "winston";

export default class Logging {
    public static getMessageString(...messageOrObject: any[]): string {
        messageOrObject = messageOrObject.flat();
        return messageOrObject.map((obj) => {
            if (typeof(obj) === "string") {
                return obj;
            }
            return util.inspect(obj);
        }).join(" ");
    }
    public static rootLogger: Logger;
    public static configureLogging(level: string): void {
        this.rootLogger = winston.createLogger({
            level,
            transports: [
                new winston.transports.Console({
                    level,
                    format: winston.format.combine(
                        winston.format.timestamp({
                            format: "HH:mm:ss:SSS",
                        }),
                        winston.format.printf(
                        (info) => {
                            const reqId = info.reqId ? `${info.reqId} ` : '';
                            const module = info.module ? `[${info.module}] ` : '';
                            return `${info.timestamp} ${info.level.toUpperCase()} ${module}${reqId}${info.message}`;
                        },
                    )),
                }),
            ],
        });
        LogService.setLogger({
            info: (module: string, ...messageOrObject: any[]) => {
                // These are noisy, redirect to debug.
                if (module.startsWith("MatrixLiteClient")) {
                    this.rootLogger.debug(Logging.getMessageString(messageOrObject), { module });
                    return;
                }
                this.rootLogger.info(Logging.getMessageString(messageOrObject), { module });
            },
            warn: (module: string, ...messageOrObject: any[]) => {
                if (messageOrObject[0].includes && messageOrObject[0].includes("room account data")) {
                    this.rootLogger.debug(Logging.getMessageString(messageOrObject), { module });
                    return; // This is just noise :|
                }
                this.rootLogger.warn(Logging.getMessageString(messageOrObject), { module });
            },
            error: (module: string, ...messageOrObject: any[]) => {
                const err = (messageOrObject[0]?.body || messageOrObject[1]?.body)?.error;
                // Filter the more noisy ones to debug.
                if (err === "Room account data not found" ||
                    err === "Account data not found" ||
                    err === "Event not found.") {
                    this.rootLogger.debug(Logging.getMessageString(messageOrObject), { module });
                    return;
                }
                this.rootLogger.error(Logging.getMessageString(messageOrObject), { module });
            },
            debug: (module: string, ...messageOrObject: any[]) => {
                this.rootLogger.debug(Logging.getMessageString(messageOrObject), { module });
            },
            trace: (module: string, ...messageOrObject: any[]) => {
                this.rootLogger.log('trace', Logging.getMessageString(messageOrObject), { module });
            },
        });
        LogService.info("LogWrapper", `Reconfigured logging ${level}`);
    }

    constructor(private module?: string, private requestId?: string) { }

    /**
     * Logs to the DEBUG channel
     * @param {string} msg The message
     * @param {*[]} messageOrObject The data to log
     */
    public debug(msg: string, ...messageOrObject: any[]): void {
        Logging.rootLogger.debug(
            Logging.getMessageString(msg,messageOrObject), 
            {
                module: this.module,
                reqId: this.requestId,
            }
        );
    }

    /**
     * Logs to the ERROR channel
     * @param {string} msg The message
     * @param {*[]} messageOrObject The data to log
     */
    public error(msg: string, ...messageOrObject: any[]): void {
        Logging.rootLogger.error(
            Logging.getMessageString(msg,messageOrObject), 
            {
                module: this.module,
                reqId: this.requestId,
            }
        );
    }

    /**
     * Logs to the INFO channel
     * @param {string} msg The message
     * @param {*[]} messageOrObject The data to log
     */
    public info(msg: string, ...messageOrObject: any[]): void {
        Logging.rootLogger.info(
            Logging.getMessageString(msg,messageOrObject), 
            {
                module: this.module,
                reqId: this.requestId,
            }
        );
    }

    /**
     * Logs to the WARN channel
     * @param {string} msg The message
     * @param {*[]} messageOrObject The data to log
     */
    public warn(msg: string, ...messageOrObject: any[]): void {
        Logging.rootLogger.warn(
            Logging.getMessageString(msg,messageOrObject), 
            {
                module: this.module,
                reqId: this.requestId,
            }
        );
    }
}
