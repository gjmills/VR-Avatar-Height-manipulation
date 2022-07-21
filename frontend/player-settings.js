const config = require("./config");
const {debounce} = require("./utils");

function isXRMode(el) {
  return el.sceneEl.is("vr-mode") || el.sceneEl.is("ar-mode");
}

class PlayerSettings {
  constructor(el) {
    let self  = this;
    this.el = el;

    // Reuse NAF network ID as user ID.
    this.userId = NAF.utils.getNetworkId(this.el.querySelector("#local-avatar"));
    if (!this.userId) {
      throw new Error("can not get userId");
    }

    this.tickFunc = null;

    const session = AFRAME.utils.getUrlParameter("session");
    const profile = AFRAME.utils.getUrlParameter("profile");
    this.height = config.profiles[profile];
    this.enterUrl = `/enter/${session}/${this.userId}`;
    this.leaveUrl = `/leave/${session}/${this.userId}`;

    this.avatar = this.el.querySelector(".avatar");
    this.avatarPosition = new THREE.Vector3();
    this.avatarMaxY = 0;
    this.avatarHeadCompensation = 0.11;
    this.body = this.el.querySelector(".body");

    if (typeof XRFrame === "function") {
      this.builtinXRFrameGetViewerPose = XRFrame.prototype.getViewerPose;
      this.builtinXRFrameGetPose = XRFrame.prototype.getPose;
    }

    this.registerEventHandlers();

    this.i = 0;
  }

  enterSession() {
    // this.el.object3D.position.setY(this.height - this.avatarHeadCompensation);
    this.el.object3D.position.setY(this.height - this.avatarHeadCompensation);

    fetch(this.enterUrl)
    .then(response => response.json())
    .then(data => {
      // Set X/Z position and camera rotation.
      this.el.object3D.position.setX(data.position.x);
      this.el.object3D.position.setZ(data.position.z);
      this.el.object3D.rotation.y += THREE.Math.degToRad(data.rotation.y);
    })
    .catch((error) => {
      throw new Error(`Error entering session: ${error}`);
    });
  }

  registerEventHandlers() {
    window.addEventListener("beforeunload", () => this.leaveSession());
    this.el.sceneEl.addEventListener("enter-vr", () => this.enterVR());
    this.el.sceneEl.addEventListener("exit-vr", () => this.exitVR());
  }

  leaveSession() {
    let wait = true;

    fetch(this.leaveUrl).then(response => {
      wait = false;
    })
    .catch((error) => {
      throw new Error(`Error existing session: ${error}`);
    });

    // Workaround. Browser doesn't wait for async operations to
    // finish. So we'll just block is with a while loop. :)
    const start = Date.now();
    while (wait) {
      const ms = Date.now() - start;
      // Don't block the browser for too long. Browser kills the page
      // when it takes too long.
      if (ms > 5000) {
        break;
      }
    }
  }

  enterVR() {
    console.log("enterVR");

    if (typeof XRFrame !== "function") {
      return;
    }

    let self = this;

    this.el.object3D.position.setY(0);

    this.tickFunc = this.recordAvatarY();

    XRFrame.prototype.getViewerPose = function(referenceSpace) {
      let offsetY = 0;

      if (self.avatarMaxY > 0) {
        offsetY = -(self.height - self.avatarMaxY - self.avatarHeadCompensation);
      }

      const offset = new XRRigidTransform({x: 0, y: offsetY, z: 0});
      const newref = referenceSpace.getOffsetReferenceSpace(offset);
      return self.builtinXRFrameGetViewerPose.call(this, newref);
    };

    XRFrame.prototype.getPose = function(space, baseSpace) {
      // console.log("DEBUG space", space);
      // console.log("DEBUG baseSpace", baseSpace);

      let offsetY = 0;

      if (self.avatarMaxY > 0) {
        offsetY = -(self.height - self.avatarMaxY - self.avatarHeadCompensation);
      }

      const offset = new XRRigidTransform({x: 0, y: offsetY, z: 0});
      const newref = baseSpace.getOffsetReferenceSpace(offset);
      return self.builtinXRFrameGetPose.call(this, space, newref);
    };
  }

  exitVR() {
    if (typeof XRFrame !== "function") {
      return;
    }

    console.log("exitVR");
    XRFrame.prototype.getViewerPose = this.builtinXRFrameGetViewerPose;
    XRFrame.prototype.getPose = this.builtinXRFrameGetPose;
    this.tickFunc = null;
  }

  recordAvatarY() {
    const buffer = [];

    setTimeout(() => {
      console.log(`Done, recording, setting avatarMaxY to ${Math.max(...buffer)}`);
      this.avatarMaxY = Math.max(...buffer);
      this.tickFunc = null;
    }, 5000);

    return () => {
      buffer.push(this.avatarPosition.y);
    };
  }

  tick() {
    this.avatar.object3D.getWorldPosition(this.avatarPosition);
    if (this.tickFunc) {
      this.tickFunc();
    }
    if (isXRMode(this.el)) {
      // Quickfix for body Y position.
      this.body.object3D.position.setY(this.avatarPosition.y - 0.65);
    }

    if (this.i % 60 == 0) {
      console.log("DEBUG", this.avatarPosition);
    }

    this.i++;
  }
}

AFRAME.registerComponent("player-settings", {
  init: function() {
    this.playerSettings = new PlayerSettings(this.el);
    this.playerSettings.enterSession();
  },

  tick: function() {
    this.playerSettings.tick();
  },
});
