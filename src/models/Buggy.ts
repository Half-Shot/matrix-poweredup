import * as LEGO from "node-poweredup";
import { BrakingStyle, HubType } from "node-poweredup/dist/node/consts";

interface BuggyDevices {
    driveMotor: LEGO.TechnicLargeLinearMotor // A
    steeringMotor: LEGO.TechnicLargeLinearMotor // B
    tiltSensor: LEGO.TechnicMediumHubTiltSensor; // onHub
    gyroSensor: LEGO.TechnicMediumHubGyroSensor;
    accelSensor: LEGO.TechnicMediumHubAccelerometerSensor;
    currentSensor: LEGO.CurrentSensor;
    voltageSensor: LEGO.VoltageSensor;
    led: LEGO.HubLED;
}

const MAX_ANGLE = 30;

export class Buggy {

    private currentSteerAngle = 0;
    
    static async fromHub(hub: LEGO.Hub): Promise<Buggy> {
        if (hub.type !== HubType.TECHNIC_MEDIUM_HUB) {
            throw Error('Wrong hub type, expected TECHNIC_MEDIUM_HUB');
        }
        return new Buggy({
            driveMotor: await hub.getDeviceAtPort("A") as LEGO.TechnicLargeLinearMotor,
            steeringMotor: await hub.getDeviceAtPort("B") as LEGO.TechnicLargeLinearMotor,
            tiltSensor: (await hub.getDevicesByType(LEGO.Consts.DeviceType.TECHNIC_MEDIUM_HUB_GYRO_SENSOR))[0] as LEGO.TechnicMediumHubGyroSensor,
            gyroSensor: (await hub.getDevicesByType(LEGO.Consts.DeviceType.TECHNIC_MEDIUM_HUB_GYRO_SENSOR))[0] as LEGO.TechnicMediumHubGyroSensor,
            accelSensor: (await hub.getDevicesByType(LEGO.Consts.DeviceType.TECHNIC_MEDIUM_HUB_ACCELEROMETER))[0] as LEGO.TechnicMediumHubAccelerometerSensor,
            currentSensor: (await hub.getDevicesByType(LEGO.Consts.DeviceType.CURRENT_SENSOR))[0] as LEGO.CurrentSensor,
            voltageSensor: (await hub.getDevicesByType(LEGO.Consts.DeviceType.VOLTAGE_SENSOR))[0] as LEGO.VoltageSensor,
            led: (await hub.getDevicesByType(LEGO.Consts.DeviceType.HUB_LED))[0] as LEGO.HubLED,
        }, hub);
    }

    constructor(private devices: BuggyDevices, private hub: LEGO.TechnicMediumHub) {
        const undefinedDevices = Object.entries(devices).filter(([name, s]) => s === undefined).map(([name]) => name);
        if (undefinedDevices.length > 0) {
            throw Error(`Could not find devices: ${undefinedDevices.join(", ")}`)
        }
    }
    
    public async reset() {
        await this.devices.steeringMotor.gotoRealZero(100);
        this.currentSteerAngle = 0;
    }

    public async steer(direction: "left"|"right", degrees: number) {
        const multiplier = (direction === "right" ? 1 : -1);
        await this.devices.steeringMotor.rotateByDegrees(degrees, multiplier * 100);
        // This cannot be higher than MAX_ANGLE
        this.currentSteerAngle += Math.max(-MAX_ANGLE, Math.min(degrees + multiplier, MAX_ANGLE));
    }

    public async drive(direction: "forward"|"reverse", speed: number,) {
        const multiplier = (direction === "reverse" ? 1 : -1);
        await this.devices.driveMotor.setSpeed(speed * multiplier, 500);
    }

    public async sleep(timeMs: number) {
        return this.hub.sleep(timeMs);
    }
}