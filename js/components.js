// A-frame Components


// Prompt enabling motion sensors for mobile devices
function setupMotionSensors() {
    // Check if DeviceMotionEvent is available and the user agent indicates a mobile device
    if (typeof DeviceMotionEvent !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) {
        let motionReceived = false;
        // Test if motion sensors are already active
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


// Add performance statistics if on development environment
document.addEventListener("DOMContentLoaded", function () {
    const scene = document.querySelector('a-scene');
    const currentUrl = window.location.href;
    // Check if the URL contains any of the specified paths
    if (currentUrl.includes('/dream-dome/')) {
        // Add stats attribute which displays performance statistics
        scene.setAttribute('stats', '');
    }
});


// Reset Local Storage
AFRAME.registerComponent('reset-storage', {
    init: function () {
        localStorage.setItem('movementState', 'inactive');
    }
});


// Dim the lights
// Note: This is specifically for the "Dreams" environment.
AFRAME.registerComponent('dim-lights', {
    init: function () {
        const defaultLights = document.querySelector("a-entity.env-dream a-entity.environment:nth-child(2)");
        defaultLights.setAttribute("visible", false);
    }
});


// Use fuse cursor on tablets too
// Note: The fuse is supposed to be the default on mobile devices, but on tablets seem to be considered desktop devices. They should behave like mobile devices, so this is a workaround.
document.addEventListener('DOMContentLoaded', function () {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const reticle = document.querySelector('#reticle');
    if (isMobile) {
        reticle.setAttribute('cursor', 'fuse', 'true');
    }
});


// Toggle Music
AFRAME.registerComponent('toggle-music', {
    init: function () {
        const el = this.el;
        // Reset Local Storage
        localStorage.setItem('soundState', 'paused');
        localStorage.removeItem('soundState');
        // Speaker - Play/Pause Toggle
        el.addEventListener('click', playPauseToggle);
        function playPauseToggle() {
            const soundState = localStorage.getItem('soundState');
            const torus = document.querySelector('#ps-torus');
            const cone = document.querySelector('#ps-cone');
            if (soundState == "playing") {
                console.log('was playing');
                el.components.sound.pauseSound();
                torus.setAttribute("material", "color: #53e4e1; opacity: .5;");
                cone.setAttribute("material", "color: #53e4e1; opacity: .5;");
                localStorage.setItem('soundState', 'paused');
            } else {
                console.log('was paused');
                el.components.sound.playSound();
                torus.setAttribute("material", "color: #53e4e1; opacity: 1;");
                cone.setAttribute("material", "color: #53e4e1; opacity: 1;");
                localStorage.setItem('soundState', 'playing');
            }
        }
    }
});


// Open/close the elevator door and play sound
AFRAME.registerComponent('open-door', {
    init: function () {
        const elDoor = document.querySelector('.el-door');
        const soundEntity = document.querySelector('#elevator-door-trigger');
        // Play the sound using the sound component of the A-Frame entity
        this.playDoorSound = function () {
            soundEntity.components.sound.playSound();
        };
        // Open the door
        this.openElevatorDoor = function (evt) {
            console.log('Door opened');

            elDoor.setAttribute('animation__theta', 'property: geometry.thetaStart; dur: 1000;');
            if (evt.target.components["aabb-collider"].closestIntersectedEl.id == "elevator-door-trigger") {
                this.playDoorSound(); // Play the door sound
                elDoor.setAttribute('animation__theta', 'to', 35);
                elDoor.components.animation__theta.play();
            }
        };
        // Close the door
        this.closeElevatorDoor = function (evt) {
            if (evt.target.components["aabb-collider"].hitClosestEventDetail.el.id == "elevator-door-trigger") {
                this.playDoorSound(); // Play the door sound
                elDoor.setAttribute('animation__theta', 'to', -35);
                elDoor.components.animation__theta.play();
            }
        };
        // Add collision event listeners
        this.el.addEventListener('hitstart', this.openElevatorDoor.bind(this));
        this.el.addEventListener('hitend', this.closeElevatorDoor.bind(this));
    }
});


// Elevator Ride
AFRAME.registerComponent('elevator-trip', {
    schema: {
        rideType: { type: 'string', default: 'skybox-tour' }
    },
    init: function () {
        const el = this.el;
        const elevatorEl = document.querySelector('#elevator');
        const cameraEl = document.querySelector('.user');
        const mainCameraEl = cameraEl.querySelector('#cameraRig');

        el.addEventListener('click', () => {
            // Play the sound of a button press on the control panel
            const buttonSound = document.querySelector('.cpanel').components.sound;
            buttonSound.playSound();
            // Exit if another ride is in progress
            const elevatorController = document.querySelector('#elevator').components['elevator-controller'];
            if (elevatorController.data.isMoving) {
                return;
            }
            elevatorController.data.isMoving = true;
            // Blink
            cameraEl.components['blink-control'].showEyelids(mainCameraEl);
            cameraEl.components['blink-control'].blinkShut();
            setTimeout(() => {
                // Start the elevator trip
                this.startElevatorTrip(elevatorEl, cameraEl);
                cameraEl.components['blink-control'].blinkOpen();
                setTimeout(() => {
                    cameraEl.components['blink-control'].hideEyelids(mainCameraEl);
                }, 150);
            }, 500);
        });
    },
    // Start the elevator trip
    startElevatorTrip: function (elevatorEl, cameraEl) {
        const elevatorDoorTriggerEl = document.querySelector('#elevator-door-trigger');
        const elevatorFloorEl = document.querySelector('.el-floor');
        const elevatorCeilingEl = document.querySelector('.el-ceiling');
        const elevatorMainEl = document.querySelector('.el-mainbody');
        const elevatorDoorArcEl = document.querySelector('.el-door-arc');
        const elevatorDoorEl = document.querySelector('.el-door');
        const elevatorElX = elevatorEl.getAttribute('position').x;
        const elevatorElY = elevatorEl.getAttribute('position').y;
        const elevatorElZ = elevatorEl.getAttribute('position').z;
        // Move user to center of elevator. Since they can't move, this is just for a consistent starting point.
        cameraEl.setAttribute('position', { x: elevatorElX, y: elevatorElY, z: elevatorElZ });
        // Move elevator door trigger a little bit forward it's less sensitive during the trip
        const elevatorDoorTriggerElX = elevatorDoorTriggerEl.getAttribute('position').x;
        const elevatorDoorTriggerElY = elevatorDoorTriggerEl.getAttribute('position').y;
        const elevatorDoorTriggerElZ = elevatorDoorTriggerEl.getAttribute('position').z;
        elevatorDoorTriggerEl.setAttribute('position', { x: elevatorDoorTriggerElX, y: elevatorDoorTriggerElY, z: 12 });
        // Make the elevator floor and glass nearly invisible during the trip.
        elevatorFloorEl.setAttribute('material', 'color', '#252d2c'); // This is to help with the transition
        elevatorFloorEl.setAttribute('animation__color', {
            property: 'material.color',
            to: '#ffffff',
            dur: 2000
        });
        elevatorFloorEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.01,
            dur: 2000
        });
        elevatorFloorEl.setAttribute('material', 'src', null);
        elevatorCeilingEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.2,
            dur: 2000
        });
        elevatorMainEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.1,
            dur: 2000
        });
        elevatorDoorArcEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.1,
            dur: 2000
        });
        elevatorDoorEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.15,
            dur: 2000
        });

        // Elevator movements
        let movements;
        switch (this.data.rideType) {
            case 'cosmo-climb':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 10, z: elevatorElZ, duration: 2720, easing: 'easeInQuad' }, // Up (ease start)
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 19000 }, // Up
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 5000, vibration: 0, shootingStar: { enabled: true, delay: 1000 } }, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY + 5, z: elevatorElZ, duration: 19000 }, // Down
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 2720, easing: 'easeOutQuad' } // Down (ease finish)
                ];
                break;
            case 'skybox-tour':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 5, z: elevatorElZ, duration: 2500, easing: 'easeInQuad', sounds: ['sound-moving', 'sound-skybox-theme'] }, // Up (ease start)
                    { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ, duration: 3750, sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] }, // Up
                    { x: elevatorElX + 60, y: elevatorElY + 20, z: elevatorElZ, duration: 15000, sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] }, // Right
                    { x: elevatorElX + 60, y: elevatorElY + 20, z: elevatorElZ + 60, duration: 15000, sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] }, // Back
                    { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ + 60, duration: 15000, sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] }, // Left
                    { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ, duration: 15000, sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] }, // Forward
                    { x: elevatorElX, y: elevatorElY + 5, z: elevatorElZ, duration: 3750, sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] }, // Down
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 2500, easing: 'easeOutQuad', sounds: [{ id: 'sound-moving' }, { id: 'sound-skybox-theme' }] } // Down (ease finish)
                ];
                break;
            case 'gravity-rush':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 10, z: elevatorElZ, duration: 2500, easing: 'easeInQuad' }, // Up (ease start)
                    { x: elevatorElX, y: elevatorElY + 200, z: elevatorElZ, duration: 23750 }, // Up
                    { x: elevatorElX, y: elevatorElY + 200, z: elevatorElZ, duration: 5000, vibration: 0, shootingStar: { enabled: true, delay: 1000 }}, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY + 5, z: elevatorElZ, duration: 6300, easing: 'easeInCubic', vibration: 1, sounds: [{ id: 'sound-falling-1' }] }, // Gravity Fall
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 1250, easing: 'easeOutCubic', sounds: [{ id: 'sound-falling-1' }] } // Down (ease finish)
                ];
                break;
            case 'skydive':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 4000, z: elevatorElZ, duration: 1 }, // Up
                    { x: elevatorElX, y: elevatorElY + 4000, z: elevatorElZ, duration: 500 }, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 28571, easing: 'easeInCubic', vibrationPattern: [
                        { duration: 2000, intensity: 0 },
                        { duration: 10000, intensity: .1 },
                        { duration: 8000, intensity: .15 },
                        { duration: 4271, intensity: .2 },
                        { duration: 1000, intensity: .8 },
                        { duration: 3300, intensity: 1 }
                    ], sounds: [{ id: 'sound-falling-1', delay: 24271 }] }, // Gravity Fall
                    { x: elevatorElX, y: elevatorElY - 10, z: elevatorElZ, duration: 1000, vibration: .3, easing: 'linear', sounds: [{ id: 'sound-plunge' }] }, // Resistance
                    { x: elevatorElX, y: elevatorElY - 165, z: elevatorElZ, duration: 8380, easing: 'easeOutCubic' }, // Water Fall
                    { x: elevatorElX, y: elevatorElY - 165, z: elevatorElZ, duration: 2000, vibration: 0 }, // Hold position
                    { x: elevatorElX, y: elevatorElY - 10, z: elevatorElZ, duration: 8000, easing: 'linear' }, // Up
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 1500, easing: 'easeOutCubic' } // Up (ease finish)
                ];
                break;
        }

        let movementIndex = 0;
        let currentlyPlayingSounds = {};

        const stopAllSounds = () => {
            document.querySelectorAll('.elevator [sound]').forEach((soundEl) => {
                soundEl.components.sound.stopSound();
            });
        };

        const stopAllSoundsExcept = (soundsToKeep) => {
            Object.keys(currentlyPlayingSounds).forEach(soundId => {
                if (!soundsToKeep.includes(soundId)) {
                    const soundEntity = document.querySelector(`#${soundId}`);
                    soundEntity.components.sound.stopSound();
                    delete currentlyPlayingSounds[soundId];
                }
            });
        };

        const playSoundWithDelay = (soundId, delay = 0) => {
            setTimeout(() => {
                const soundEntity = document.querySelector(`#${soundId}`);
                if (!currentlyPlayingSounds[soundId]) {
                    soundEntity.components.sound.playSound();
                    currentlyPlayingSounds[soundId] = true;
                }
            }, delay);
        };

        const playSounds = (sounds) => {
            // Extract sound IDs from the sounds array
            const soundIds = sounds.map(sound => sound.id);

            // Stop all sounds that are not in the next movement
            stopAllSoundsExcept(soundIds);

            // Play new sounds
            sounds.forEach(sound => {
                playSoundWithDelay(sound.id, sound.delay);
            });
        };

        const moveElevator = () => {
            // End the ride if all movements are complete
            if (movementIndex >= movements.length) {
                // Stop all sounds at the end of the ride
                stopAllSounds();
                // Restore elevator door trigger position
                elevatorDoorTriggerEl.setAttribute('position', { x: elevatorDoorTriggerElX, y: elevatorDoorTriggerElY, z: elevatorDoorTriggerElZ });
                // Restore the elevator floor and glass
                elevatorFloorEl.setAttribute('animation__color', {
                    property: 'material.color',
                    to: '#808080',
                    dur: 1000
                });
                elevatorFloorEl.setAttribute('animation__opacity', {
                    property: 'material.opacity',
                    to: 1,
                    dur: 1000
                });
                elevatorCeilingEl.setAttribute('animation__opacity', {
                    property: 'material.opacity',
                    to: .4,
                    dur: 1000
                });
                elevatorMainEl.setAttribute('animation__opacity', {
                    property: 'material.opacity',
                    to: .2,
                    dur: 1000
                });
                elevatorDoorArcEl.setAttribute('animation__opacity', {
                    property: 'material.opacity',
                    to: .2,
                    dur: 1000
                });
                elevatorDoorEl.setAttribute('animation__opacity', {
                    property: 'material.opacity',
                    to: .3,
                    dur: 1000
                });
                setTimeout(() => {
                    elevatorFloorEl.setAttribute('material', 'src', '#speaker');
                }, 1050);
                // Restore the elevator state
                const elevatorController = document.querySelector('#elevator').components['elevator-controller'];
                elevatorController.data.isMoving = false;
                // Re-enable movement
                cameraEl.setAttribute('movement-controls', { enabled: true });
                cameraEl.setAttribute('arm-swing-movement', { enabled: true });
                return; // End of trip
            }

            // Start the ride
            const targetPos = movements[movementIndex];
            const duration = targetPos.duration; // Duration for each movement
            const sounds = targetPos.sounds || [{ id: 'sound-moving' }]; // Default to 'sound-moving'

            // Disable movement
            cameraEl.setAttribute('movement-controls', { enabled: false });
            cameraEl.setAttribute('arm-swing-movement', { enabled: false });

            // Play all sounds for the current movement
            playSounds(sounds);

            // Trigger vibration if enabled
            if (targetPos.vibrationPattern) {
                MSSAFrameKit.triggerHapticPattern('both', targetPos.vibrationPattern);
            } else if (targetPos.vibration || targetPos.vibration === 0) {
                MSSAFrameKit.triggerHaptics('both', duration, targetPos.vibration);
            } else {
                // Default vibration if not specified
                MSSAFrameKit.triggerHaptics('both', duration, 0.1);
            }

            // Trigger shooting stars if enabled
            if (targetPos.shootingStar && targetPos.shootingStar.enabled) {
                setTimeout(triggerShootingStars, targetPos.shootingStar.delay);
            }

            // Move Elevator
            elevatorEl.setAttribute('animation', {
                property: 'position',
                to: targetPos,
                dur: duration,
                easing: targetPos.easing || 'linear'
            });
            // Move Camera
            cameraEl.setAttribute('animation', {
                property: 'position',
                to: targetPos,
                dur: duration,
                easing: targetPos.easing || 'linear'
            });

            movementIndex++;
            setTimeout(moveElevator, duration);
        };

        moveElevator();
    },
});


// Elevator Controller
AFRAME.registerComponent('elevator-controller', {
    schema: {
        isMoving: { type: 'boolean', default: false }
    },
});


// Simulate Eyes Blinking
// Description: You can finely control blink functions that simulate eyelid movements. Any of these methods can be called from other components when needed. This is useful for when there may be a jarring transition between scene changes or camera movements.
AFRAME.registerComponent('blink-control', {
    init: function () {
        // Attach the blink method to the A-Frame element for global access
        this.el.blinkShut = this.blinkShut.bind(this);
        this.el.blinkOpen = this.blinkOpen.bind(this);
        this.el.hideEyelids = this.hideEyelids.bind(this);
        this.el.showEyelids = this.showEyelids.bind(this);
    },
    blinkShut: function () {
        // Set el to all elements with the blink-control component
        const el = document.querySelectorAll('[blink-control]');
        // Close all eyes (all cameras with component)
        el.forEach(blinkControlEl => {
            blinkControlEl.querySelector('.upper-eyelid').setAttribute('animation', {
                property: 'position',
                to: { x: 0, y: 2.5, z: -1 },
                dur: 150,
                easing: 'linear'
            });
            blinkControlEl.querySelector('.lower-eyelid').setAttribute('animation', {
                property: 'position',
                to: { x: 0, y: -2.5, z: -1 },
                dur: 150,
                easing: 'linear'
            });
        });
    },
    blinkOpen: function () {
        // Set el to all elements with the blink-control component
        const el = document.querySelectorAll('[blink-control]');
        // Open all eyes (all cameras with component)
        el.forEach(blinkControlEl => {
            blinkControlEl.querySelector('.upper-eyelid').setAttribute('animation', {
                property: 'position',
                to: { x: 0, y: 4, z: -1 },
                dur: 150,
                easing: 'linear'
            });
            blinkControlEl.querySelector('.lower-eyelid').setAttribute('animation', {
                property: 'position',
                to: { x: 0, y: -4, z: -1 },
                dur: 150,
                easing: 'linear'
            });
        });
    },
    hideEyelids: function (cameraEl) {
        // Hide the eyelids
        cameraEl.querySelector('.upper-eyelid').setAttribute('visible', false);
        cameraEl.querySelector('.lower-eyelid').setAttribute('visible', false);
    },
    showEyelids: function (cameraEl) {
        // Show the eyelids
        cameraEl.querySelector('.upper-eyelid').setAttribute('visible', true);
        cameraEl.querySelector('.lower-eyelid').setAttribute('visible', true);
    },
});


AFRAME.registerComponent('twinkling-stars', {
    init: function () {
        const starTemplate = document.querySelector('#standard-star-template');
        // Append clones to each cluster
        for (let i = 1; i <= 6; i++) {
            let cluster = document.querySelector('#star-cluster-' + i);
            let clone = starTemplate.cloneNode(true);
            cluster.appendChild(clone);
        }
        // Start the animation loops for each cluster
        for (let i = 1; i <= 6; i++) {
            let cluster = document.querySelector('#star-cluster-' + i).querySelector('.standard-star');
            setTimeout(() => {
                this.setupStars(cluster, i);
            }, 500 * (i - 1)); // Staggering initiation by 500ms
        }
    },
    setupStars: function (cluster, clusterNumber) {
        const stars = cluster.querySelectorAll('.star-single');
        let currentStar = 0;
        // Animate stars, looping forever
        const animateStar = () => {
            if (currentStar >= stars.length) {
                currentStar = 0; // Reset to start the loop again
            }
            let star = stars[currentStar];
            let starHead = star.querySelector('.star-head');
            // console.log(`Animating star ${currentStar + 1} in cluster ${clusterNumber}`);
            this.animateStarHead(starHead);
            // Wait a bit and move to next star after animation
            setTimeout(() => {
                // Remove the animation attribute to reset the star
                starHead.removeAttribute('animation__fadein');
                starHead.removeAttribute('animation__visible');
                starHead.removeAttribute('animation__fadeout');
                // Move to the next star
                currentStar++;
                animateStar();
            }, 2000); // 500ms fade-in, 500ms hold, 500ms fade-out, 500ms wait
        };
        // Start the animation with the star corresponding to the cluster number
        currentStar = (clusterNumber - 1) % stars.length;
        animateStar();
    },
    animateStarHead: function (starHead) {
        // Change the starHead's material to either white, blue, purple, or teal
        const randomColor = Math.random();
        if (randomColor < 0.25) {
            starHead.setAttribute('material', 'color: white');
        } else if (randomColor < 0.5) {
            starHead.setAttribute('material', 'color: #fc20e2'); // pink
        } else if (randomColor < 0.75) {
            starHead.setAttribute('material', 'color: purple');
        } else {
            starHead.setAttribute('material', 'color: teal');
        }
        // Animation logic: Fade in, hold, fade out
        starHead.setAttribute('animation__fadein', 'property: opacity; from: 0; to: 1; dur: 500');
        starHead.setAttribute('animation__visible', 'property: opacity; to: 1; startEvents: animationcomplete__fadein; dur: 500');
        starHead.setAttribute('animation__fadeout', 'property: opacity; from: 1; to: 0; startEvents: animationcomplete__visible; dur: 500');
    }
});


// Trigger shooting star animations
let clonesCreated = false; // Flag to track if clones are created
function triggerShootingStars() {
    const shootingStars = document.querySelectorAll('.shooting-star');
    shootingStars.forEach(function(star, index) {
        if (!clonesCreated) {
            // Build star from template
            const template = document.querySelector('#shooting-star-template').cloneNode(true);
            template.setAttribute('visible', true);
            star.appendChild(template);
        }
        // Select elements for animation
        const starPosition = star.querySelector('.star-position');
        const starParts = star.querySelectorAll('.star-head, .star-tail');
        const starTail = star.querySelector('.star-tail');
        // // Show the stars
        star.setAttribute('visible', true);
        starParts.forEach(part => part.setAttribute('visible', true));
        // Fade in and out the star parts
        starParts.forEach(part => {
            part.setAttribute('animation__fadein', {
                property: 'opacity',
                from: 0,
                to: 1,
                dur: 500,
                easing: 'linear'
            });
            part.setAttribute('animation__fadeout', {
                property: 'opacity',
                from: 1,
                to: 0,
                delay: 3000,
                dur: 1000,
                easing: 'linear'
            });
        });
        // Animate the star tail
        starTail.setAttribute('animation__scale', {
            property: 'scale',
            to: '3 .3 1',
            loop: true,
            dur: 2000,
            easing: 'easeOutQuad',
            dir: 'alternate'
        });
        starTail.setAttribute('animation__position', {
            property: 'position',
            to: '4.7 1 0',
            loop: true,
            dur: 2000,
            easing: 'easeOutQuad',
            dir: 'alternate'
        });
        // Move the star
        starPosition.setAttribute('animation__move', {
            property: 'position',
            to: '-465 55 -130',
            dur: 4000,
            easing: 'linear'
        });
        // Reset position and hide stars at the end of the animation
        starPosition.addEventListener('animationcomplete__move', function () {
            starPosition.setAttribute('position', '-305 215 -290');
            starPosition.removeAttribute('animation__move');
            starTail.removeAttribute('animation__scale');
            starTail.removeAttribute('animation__position');
            starParts.forEach(part => {
                part.removeAttribute('animation__fadein');
                part.removeAttribute('animation__fadeout');
            });
            star.setAttribute('visible', false);
            starParts.forEach(part => part.setAttribute('visible', false));
        }, {once: true}); // Ensure the listener is removed after execution
    });
    clonesCreated = true; // Set flag to true after first creation
}

// // Testing: Trigger shooting stars after 2 seconds
// window.addEventListener('load', function() {
//     setTimeout(function() {
//         triggerShootingStars();
//         setInterval(triggerShootingStars, 6000);
//     }, 2000);
// });


/**
 * Add Model After Load
 *
 * Description: This component loads a GLTF model and adds an ammo-shape to it after the model is loaded. It's a workaround to use Ammo.js physics with 3D models.
 *
 * Credit: Based on snippet from icurtis1 🙏 (https://github.com/n5ro/aframe-physics-system/issues/192)
 *
 */
AFRAME.registerComponent('add-model-after-load', {
    schema: {
        model: { default: '' },
        body: { type: 'string', default: 'dynamic' },
        shape: { type: 'string', default: 'hull' },
        restitution: { type: 'number', default: 0 },
    },
    init() {
        const gltfModel = document.createElement('a-entity');
        this.el.appendChild(gltfModel);
        gltfModel.setAttribute('gltf-model', this.data.model);
        gltfModel.setAttribute('shadow', { receive: false });
        // Specify what type of ammo-body (dynamic, static, kinematic)
        gltfModel.setAttribute('ammo-body', { type: this.data.body, restitution: this.data.restitution });
        // Wait for model to load before adding ammo-shape (box, cylinder, sphere, capsule, cone, hull)
        this.el.addEventListener('model-loaded', () => {
            gltfModel.setAttribute('ammo-shape', { type: this.data.shape });
        })
    }
});