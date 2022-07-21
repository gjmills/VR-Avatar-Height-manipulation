require("aframe");
require("networked-aframe");
require("./movement-recorder");
require("./player-settings");
require("./restrict-position");
require("./dynamic-room");
require("./tracked-vr-hands");

// see issue https://github.com/networked-aframe/networked-aframe/issues/267
NAF.schemas.getComponentsOriginal = NAF.schemas.getComponents;
NAF.schemas.getComponents = (template) => {
    if (!NAF.schemas.hasTemplate("#head-template")) {
      NAF.schemas.add({
        template: "#head-template",
         components: [
          "position",
          "rotation",
          "scale",
        ]
      });
    }
    if (!NAF.schemas.hasTemplate("#camera-rig-template")) {
      NAF.schemas.add({
        template: "#camera-rig-template",
         components: [
          "position",
          "rotation",
          "scale",
        ]
      });
    }
    const components = NAF.schemas.getComponentsOriginal(template);
    return components;
};

AFRAME.registerComponent("follow-entity", {
  schema: {
    query: {type: "string"},
  },
  tick: function() {
    const el = document.querySelector(this.data.query);
    this.el.object3D.position.setX(el.object3D.position.x);
    this.el.object3D.position.setZ(el.object3D.position.z);
    this.el.object3D.rotation.set(
      this.el.object3D.rotation.x,
      el.object3D.rotation.y,
      this.el.object3D.rotation.z,
      "XYZ",
    );
  },
});
