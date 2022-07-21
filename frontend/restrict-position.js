const Box2Parameter = {
  parse: function (v) {
    let n = v.split(" ");
    if (n.length != 4) {
      throw "boundingBox must have 4 numbers";
    }
    return new THREE.Box2(
      new THREE.Vector2(parseFloat(n[0]), parseFloat(n[1])),
      new THREE.Vector2(parseFloat(n[2]), parseFloat(n[3])),
    );
  },
  stringify: function (v) {
    return `${v.min.x} ${v.min.y} ${v.max.x} ${v.max.y}`;
  },
};

AFRAME.registerComponent("restrict-position", {
  schema: {
    boundingBox: Box2Parameter,
  },
  init: function() {
    this.minPosition = new THREE.Vector3(
      this.data.boundingBox.min.x,
      -Infinity,
      this.data.boundingBox.min.y, // NOTE: this is actually z!
    );
    this.maxPosition = new THREE.Vector3(
      this.data.boundingBox.max.x,
      Infinity,
      this.data.boundingBox.max.y, // NOTE: this is actually z!
    );
  },
  tick: function() {
    if (!this.withinBoundingBox()) {
      this.clampEntityPosition();
    }
  },
  withinBoundingBox: function() {
    return this.data.boundingBox.containsPoint(
      new THREE.Vector2(
        this.el.object3D.position.x,
        this.el.object3D.position.z,
      ),
    );
  },
  clampEntityPosition: function() {
      this.el.object3D.position.clamp(this.minPosition, this.maxPosition);
  },
});
