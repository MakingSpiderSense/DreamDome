/**
 * Dim the lights
 *
 * Note: This is specifically for the "Dreams" environment.
 */
const dimLights = {
    init: function () {
        const defaultLights = document.querySelector("a-entity.env-dream a-entity.environment:nth-child(2)");
        defaultLights.setAttribute("visible", false);
    }
};
AFRAME.registerComponent('dim-lights', dimLights);