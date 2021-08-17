import { Component, h } from 'preact';
import './App.css';
import { homeserverUrl, roomId, token } from './config';
interface State {
  error: string|null;
  gamepad?: Gamepad;
  steerValue: number;
  driveValue: number;
}
export default class App extends Component<{}, State> {
  // Return the App component.
  lastTs: number = 0;
  state: State = {
    error: null,
    steerValue: 1,
    driveValue: 1,
  };
  constructor() {
    super();
  }

  componentDidMount() {
    if (!navigator.getGamepads) {
      return this.setState({error: "Gamepads not supported"});
    }
    window.ongamepadconnected = ((e) => {
      if (!this.state.gamepad) {
        this._onGamepadRegistered(e.gamepad);
      }
    });
    window.ongamepaddisconnected = ((e) => {
      if (this.state.gamepad?.id === e.gamepad.id) {
        this.setState({gamepad: undefined, error: null});
      }
    });
    const [defaultGamepad] = navigator.getGamepads();
    if (!defaultGamepad) {
      return this.setState({error: "No gamepads present"});
    }
    this._onGamepadRegistered(defaultGamepad);
  }

  _onGamepadRegistered = (gamepad: Gamepad) => {
    this.setState({gamepad: gamepad, error: null});
    window.requestAnimationFrame(this._requestAnimationFrame);
  }

  _requestAnimationFrame = (timestamp: number) => {
    if (!this.state.gamepad) {
      // No gamepad, return
      return;
    }
    if (timestamp - this.lastTs < 33) {
      return window.requestAnimationFrame(this._requestAnimationFrame);
    }
    this.lastTs = timestamp;
    // This is for the PS3 controller.
    let [steerValue, driveValue] = this.state.gamepad.axes;
    steerValue += 1;
    driveValue += 1;
    if (Math.abs(this.state.steerValue - steerValue) > 0.05) {
      this.setState({steerValue});
      this._updateBuggySteer(steerValue - 1);
    }
    if (Math.abs(this.state.driveValue - driveValue) > 0.05) {
      this.setState({driveValue});
      this._updateBuggyPower(driveValue - 1);
    }
    return window.requestAnimationFrame(this._requestAnimationFrame);
  }

  _updateBuggySteer = async (relativePower: number) => {
    const direction = relativePower < 0 ? 'left' : 'right';
    await fetch(`${homeserverUrl}/_matrix/client/r0/rooms/${roomId}/send/uk.half-shot.matrix-poweredup.buggy.turn/${Date.now()}`, {
        "headers": {
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ts: Date.now(), direction, angle: Math.round(Math.abs(relativePower) * 10)}),
        "method": "PUT",
        "mode": "cors"
    });
  }

  _updateBuggyPower = async (relativePower: number) => {
    await fetch(`${homeserverUrl}/_matrix/client/r0/rooms/${roomId}/send/uk.half-shot.matrix-poweredup.buggy.speed/${Date.now()}`, {
        "headers": {
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ts: Date.now(), speed: Math.round((-1 * relativePower) * 100)}),
        "method": "PUT",
        "mode": "cors"
    });
  }

  render() {
    return (
      <div className="App">
        <main>
          Hello
        </main>
        {this.state.error && <div className="alert">
          {this.state.error}
        </div>}
        {this.state.gamepad && <div className="info">
          Using gamepad: {this.state.gamepad.id}
        </div>}
        <progress value={this.state.steerValue} min="0" max="2"/>
        <progress value={this.state.driveValue} min="0" max="2"/>
      </div>
    );
  }
}
