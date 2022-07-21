/**
 * Setup the Networked-Aframe scene component based on query parameters
 *
 * From: https://glitch.com/edit/#!/naf-form-example?path=public%2Fjs%2Fdynamic-room.component.js%3A6%3A21
 *
 * TODO:
 * - Save player name somewhere.
 * - Add settings selection.
 * - Rename this component!
 */
AFRAME.registerComponent('dynamic-room', {
  init: function () {
    var el = this.el;
    var params = this.getUrlParams();
    
    // Setup networked-scene
    var networkedComp = {
      room: params.session,
      adapter: "easyrtc",
      // audio: true,
    };
    console.info('Init networked-aframe with settings:', networkedComp);
    el.setAttribute('networked-scene', networkedComp);
  },

  getUrlParams: function () {
    var match;
    var pl = /\+/g;  // Regex for replacing addition symbol with a space
    var search = /([^&=]+)=?([^&]*)/g;
    var decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); };
    var query = window.location.search.substring(1);
    var urlParams = {};

    match = search.exec(query);
    while (match) {
      urlParams[decode(match[1])] = decode(match[2]);
      match = search.exec(query);
    }
    return urlParams;
  }
});
