/**
 * Dream Dome Utility Functions
 *
 * Miscellaneous helper functions used throughout the project.
 */


/**
 * Prompt enabling motion sensors for mobile devices
 */
function setupMotionSensors() {
    // Check if DeviceMotionEvent is available and the user agent indicates a mobile device
    if (typeof DeviceMotionEvent !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) {
        let motionReceived = false;
        /**
         * Test if motion sensors are already active
         */
        function motionTest(event) {
            if ((event.acceleration.x !== null || event.accelerationIncludingGravity.x !== null) && !motionReceived) {
                // Motion data is active, so hide the button
                motionReceived = true;
                document.getElementById('enableSensors').style.display = 'none';
                // Remove event listener once the motion data is confirmed active
                window.removeEventListener('devicemotion', motionTest);
            }
        }
        window.addEventListener('devicemotion', motionTest);
        // Initially check if motion data is received after a delay
        setTimeout(() => {
            if (!motionReceived) {
                // Different behavior based on whether requestPermission is available
                if (typeof DeviceMotionEvent.requestPermission === 'function') {
                    // This block handles Safari and similar browsers that allow requesting permission
                    document.getElementById('enableSensors').style.display = 'block';
                    document.getElementById('enableSensors').addEventListener('click', function() {
                        DeviceMotionEvent.requestPermission().then(response => {
                            if (response === 'granted') {
                                document.getElementById('enableSensors').style.display = 'none';
                            } else {
                                alert('Motion sensor permission denied');
                            }
                        }).catch(console.error);
                    });
                } else {
                    // This block handles others browsers where permission cannot be requested, like Chrome, Brave, etc.
                    document.getElementById('enableSensors').style.display = 'block';
                    document.getElementById('enableSensors').addEventListener('click', function() {
                        alert("Please enable motion sensors in your browser's site settings. This will allow you to look up/down and fully interact with objects in the scene.");
                    });
                }
            }
        }, 500); // Give some time to receive a motion event if active
    } else {
        console.log('DeviceMotionEvent not supported or not a mobile device');
    }
}
window.addEventListener('DOMContentLoaded', setupMotionSensors);


/**
 * Add performance statistics if on development environment
 */
document.addEventListener("DOMContentLoaded", function () {
    const scene = document.querySelector('a-scene');
    const currentUrl = window.location.href;
    // Check if the URL contains any of the specified paths
    if (currentUrl.includes('/dream-dome/')) {
        // Add stats attribute which displays performance statistics
        scene.setAttribute('stats', '');
    }
});


/**
 * Use fuse cursor on tablets too
 *
 * Note: The fuse is supposed to be the default on mobile devices, but on tablets seem to be considered desktop devices. They should behave like mobile devices, so this is a workaround.
 */
document.addEventListener('DOMContentLoaded', function () {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const reticle = document.querySelector('#reticle');
    if (isMobile) {
        reticle.setAttribute('cursor', 'fuse', 'true');
    }
});


/**
 * Fix for this error from touch-controls
 *
 * Error: "Unable to preventDefault inside passive event listener invocation."
 *
 * This completely overrides the addEventListeners function of the touch-controls component. It's the same method, just changing passive to false. Having passive to true is basically saying, "I won't interfere with the default behavior". But since we are trying calling preventDefault in the touch event handlers, it makes more sense to have passive set to false.
 */
AFRAME.components["touch-controls"].Component.prototype.addEventListeners = function () {
    const sceneEl = this.el.sceneEl;
    const canvasEl = sceneEl.canvas;
    if (!canvasEl) {
        sceneEl.addEventListener("render-target-loaded", this.addEventListeners.bind(this));
        return;
    }
    canvasEl.addEventListener("touchstart", this.onTouchStart, { passive: false });
    canvasEl.addEventListener("touchend", this.onTouchEnd, { passive: false });
    const vrModeUI = sceneEl.getAttribute("vr-mode-ui");
    if (vrModeUI && vrModeUI.cardboardModeEnabled) {
        sceneEl.addEventListener("enter-vr", this.onEnterVR);
    }
};