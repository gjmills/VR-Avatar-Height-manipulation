const config = require("./config");

class MovementRecorder {
  constructor(el) {
    this.el = el;
    this.buffer = [];
    this.lastItem = null;
    this.sender = null;
    this.sendInterval = 2000;
    // Just get height from URL.
    const profile = AFRAME.utils.getUrlParameter("profile");
    this.height = config.profiles[profile];
    this.session = AFRAME.utils.getUrlParameter("session");

    this.el.sceneEl.addEventListener("enter-vr", () => this.enterVR());
    this.el.sceneEl.addEventListener("exit-vr", () => this.exitVR());
    this.collectEnabled = false;
  }

  startSender() {
    if (!this.sender) {
      this.sender = setInterval(() => this.send(), this.sendInterval);
    }
  }

  stopSender() {
    if (this.sender) {
      clearInterval(this.sender);
    }
  }

  enterVR() {
    this.collectEnabled = true;
  }

  exitVR() {
    this.collectEnabled = false;
  }

  collect() {
    if (!this.collectEnabled) {
      return;
    }

    const headRotation = this.el.object3D.rotation;
    const rotation = [
      headRotation.x,
      headRotation.y,
      headRotation.z,
    ];

    const position = this.el.object3D.position.toArray();

    let leftHandRotation = [];
    let leftHandPosition = [];
    const leftHand = document.querySelector("#my-tracked-left-hand");
    if (leftHand) {
      const tmp = leftHand.object3D.rotation;
      leftHandRotation = [tmp.x, tmp.y, tmp.z];
      leftHandPosition = leftHand.object3D.position.toArray();
    }

    let rightHandRotation = [];
    let rightHandPosition = [];
    const rightHand = document.querySelector("#my-tracked-right-hand");
    if (rightHand) {
      const tmp = rightHand.object3D.rotation;
      rightHandRotation = [tmp.x, tmp.y, tmp.z];
      rightHandPosition = rightHand.object3D.position.toArray();
    }

    const datapoint = {
      datetime: Date.now(),
      height: this.height,
      rotation: rotation,
      position: position,
      leftHandRotation: leftHandRotation,
      leftHandPosition: leftHandPosition,
      rightHandRotation: rightHandRotation,
      rightHandPosition: rightHandPosition,
    };

    // Only add new data to buffer! (i.e. the player moved).
    // if (!this.lastItem || !this.isEqual(datapoint, this.lastItem)) {
      // Add datapoint to buffer. Buffer is sent to server every 5 seconds.
      this.buffer.push(datapoint);
      this.lastItem = datapoint;
    // }
  }

  isEqual(a, b) {
    // Exclude datetime, otherwise it's never equal.
    return a.position.every((val, idx) => val === b.position[idx]) &&
      a.rotation.every((val, idx) => val === b.rotation[idx]);
  }

  send() {
    if (!this.collectEnabled) {
      return;
    }

    const networkId = NAF.utils.getNetworkId(this.el);

    if (this.buffer.length === 0) {
      return;
    }

    let data = this.buffer;
    this.buffer = [];

    fetch(`/record/${this.session}/${networkId}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data),
    }).then(response => {
      console.debug(`send ${data.length} recordings for ${networkId} to server`);
    });
    // TODO: Catch error and insertLeft data into buffer.
  }
}

AFRAME.registerComponent("record-movement", {
  init: function() {
    this.recorder = new MovementRecorder(this.el);
    this.recorder.startSender();
  },
  remove: function() {
    this.recorder.stopSender();
  },
  tick: function() {
    this.recorder.collect();
  },
});
