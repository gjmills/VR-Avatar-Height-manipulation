AFRAME.registerComponent('tracked-vr-hands', {
  onEnterVR() {
    if (AFRAME.utils.device.isMobile()) return; // exclude e.g. cardboard, which lacks tracked controllers
    if (document.getElementById('my-tracked-right-hand')) return; // don't add them in more than once!
    // add these with JS:
    // <a-entity hand-controls="hand:left" networked="template:#left-hand-template;attachTemplateToLocal:true;"></a-entity>
    // <a-entity hand-controls="hand:right" networked="template:#right-hand-template;attachTemplateToLocal:true;"></a-entity>
    ['left', 'right'].forEach(side => {
      const el = document.createElement('a-entity')
      el.setAttribute('hand-controls', {hand: side});
      el.setAttribute('networked', {template: `#${side}-hand-template`, attachTemplateToLocal: false});
      el.setAttribute('id', `my-tracked-${side}-hand`);
      // note that the ID will be applied to THIS client's hands,
      // but not other connected clients,
      // and not on the machine of other connected clients
      this.el.appendChild(el);
    })
  },
  init() {
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
    // future improvements:
    // pick up hand-controls events
    // https://github.com/aframevr/aframe/blob/b164623dfa0d2548158f4b7da06157497cd4ea29/docs/components/hand-controls.md
    // and broadcast the matching gestures to other connected clients
    // possibly trigger the animation on the model itself using animation-mixer:
    // https://github.com/n5ro/aframe-extras/tree/master/src/loaders
    // could add as 'networked-hands' component within repo
  }
});
