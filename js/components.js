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




/**
 * Orb Collection Minigame
 *
 * Description: Spawns collectible glowing orbs above a nav mesh, spaces them apart, removes them when the player gets close, and plays optional sounds for orb collection and full completion.
 *
 * Example: <a-scene orb-collection-minigame="navMeshEl: #my-nav-mesh; collectSound: #orb-collect; allCollectedSound: #orb-win"></a-scene>
 *
 * Use the IDs of the entities for the nav mesh and sounds (not the asset IDs).
 */
AFRAME.registerComponent('orb-collection-minigame', {
    schema: {
        navMeshEl: { type: 'selector', default: '[nav-mesh]' },
        count: { type: 'int', default: 20  },
        height: { type: 'number', default: 1.5 },
        minDistance: { type: 'number', default: 6 },
        collectRadius: { type: 'number', default: 1.8 },
        collectSound: { type: 'string', default: '' },
        allCollectedSound: { type: 'string', default: '' },
    },

    init: function () {
        this.orbs = []; // Array to hold references to the spawned orbs
        this.collected = 0; // Counter for collected orbs
        this.cameraWorldPosition = new THREE.Vector3(); // To store camera world position for distance calculations
        this.tickFrameCounter = 0; // Counter to track frames for throttling distance checks
        this.hasCollectedAllOrbs = false;
        this.gameStartTime = null; // Set to Date.now() when the first orb is collected
        this.hudEl = null; // HUD container entity (parented to camera)
        this.hudOrbCountTextEl = null; // Text element showing orbs collected count
        this.hudTimerTextEl = null; // Text element showing elapsed time
        this.leaderboardEl = null; // Leaderboard container entity (parented to camera)

        // Hidden reset: add ?reset-scores to the URL to wipe the leaderboard
        if (new URLSearchParams(window.location.search).has('reset-scores')) {
            localStorage.removeItem('orb-minigame-scores');
        }

        // Create the HUD attached to camera. Defer if camera isn't ready yet.
        if (this.el.sceneEl.camera) {
            this.createHud();
        } else {
            this.el.sceneEl.addEventListener('camera-set-active', () => this.createHud(), { once: true });
        }

        // Make sure nav mesh is loaded before spawning orbs
        const navMeshEl = this.data.navMeshEl;
        if (!navMeshEl) { console.warn('orb-collection-minigame: navMeshEl not found'); return; }
        // Spawn orbs once nav mesh is ready.
        if (navMeshEl.getObject3D('mesh')) {
            this.spawnOrbs();
        } else {
            navMeshEl.addEventListener('model-loaded', () => this.spawnOrbs(), { once: true });
        }
    },

    spawnOrbs: function () {
        const navMeshEl = this.data.navMeshEl;
        const navMeshObject3D = navMeshEl.getObject3D('mesh');
        if (!navMeshObject3D) { console.warn('orb-collection-minigame: nav mesh Object3D not ready'); return; }
        const navMeshBounds = new THREE.Box3().setFromObject(navMeshObject3D);
        const surfaceRaycaster = new THREE.Raycaster();
        const downwardRayDirection = new THREE.Vector3(0, -1, 0);
        const rayOrigin = new THREE.Vector3();
        const targetOrbCount = this.data.count;
        const orbHeightOffset = this.data.height;
        const minSpacingSquared = this.data.minDistance * this.data.minDistance;
        const placedOrbPositions = [];
        let spawnAttempts = 0;

        // Attempt to place all orbs
        while (placedOrbPositions.length < targetOrbCount && spawnAttempts < targetOrbCount * 150) {
            spawnAttempts++; // Keep track to prevent infinite loop if nav mesh is too small or minDistance too large
            const randomX = THREE.MathUtils.lerp(navMeshBounds.min.x, navMeshBounds.max.x, Math.random());
            const randomZ = THREE.MathUtils.lerp(navMeshBounds.min.z, navMeshBounds.max.z, Math.random());
            // Cast a ray downward from above the nav mesh to find the surface height at the random (x, z) position
            rayOrigin.set(randomX, navMeshBounds.max.y + 5, randomZ);
            surfaceRaycaster.set(rayOrigin, downwardRayDirection);
            // Check if the ray intersects with the nav mesh
            const rayHits = surfaceRaycaster.intersectObject(navMeshObject3D, true);
            if (!rayHits.length) continue;
            // Candidate orb position is `orbHeightOffset` meters above the nav mesh surface at the ray hit point
            const candidateOrbPosition = new THREE.Vector3(
                rayHits[0].point.x,
                rayHits[0].point.y + orbHeightOffset,
                rayHits[0].point.z
            );
            // Check if candidate position is too close to any already placed orb. If so discard attempt and try again
            let isTooCloseToExistingOrb = false;
            for (const placedOrbPosition of placedOrbPositions) {
                const deltaX = candidateOrbPosition.x - placedOrbPosition.x;
                const deltaZ = candidateOrbPosition.z - placedOrbPosition.z;
                if (deltaX * deltaX + deltaZ * deltaZ < minSpacingSquared) {
                    isTooCloseToExistingOrb = true;
                    break;
                }
            }
            if (isTooCloseToExistingOrb) continue;
            // Candidate position is valid, add to list of placed orbs
            placedOrbPositions.push(candidateOrbPosition);
        }

        // Send warning if we weren't able to place the target number of orbs
        if (placedOrbPositions.length < targetOrbCount) {
            console.warn(`orb-collection-minigame: placed ${placedOrbPositions.length}/${targetOrbCount} orbs — nav mesh may be too small or minDistance too large`);
        }

        // Create and place orbs at the valid positions we found
        const orbColors = ['#96fffe', '#3DFFA0', '#FFE45E', '#d7ffe7'];
        placedOrbPositions.forEach(orbPosition => {
            const orb = document.createElement('a-sphere');
            const randomAnimationDelay = Math.floor(Math.random() * 4001);
            const randomStartingColorIndex = Math.floor(Math.random() * orbColors.length);
            const startingColor = orbColors[randomStartingColorIndex];
            const bobStartY = (orbPosition.y - 0.05).toFixed(3);
            const bobEndY = (orbPosition.y + 0.05).toFixed(3);
            orb.setAttribute('radius', '0.3');
            orb.setAttribute('position', `${orbPosition.x} ${orbPosition.y} ${orbPosition.z}`);
            orb.setAttribute('material', `color: ${startingColor}; emissive: #1A1A2E; emissiveIntensity: 0.5; opacity: 0.75; transparent: true; shader: standard`);

            // Vertical bob: each orb floats 10 cm total on the Y axis with a randomized startup offset
            orb.setAttribute('animation__float', `property: position; from: ${orbPosition.x} ${bobStartY} ${orbPosition.z}; to: ${orbPosition.x} ${bobEndY} ${orbPosition.z}; dir: alternate; dur: 2200; easing: easeInOutSine; loop: true; delay: ${randomAnimationDelay}`);

            // Pulsing scale: each orb randomly varies between 0.9 and 1.1 scale, with the same randomized startup offset
            const randomFromScaleX = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomFromScaleY = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomFromScaleZ = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomToScaleX = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomToScaleY = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomToScaleZ = (Math.random() * 0.2 + 0.9).toFixed(2);
            orb.setAttribute('animation__pulse', `property: scale; from: ${randomFromScaleX} ${randomFromScaleY} ${randomFromScaleZ}; to: ${randomToScaleX} ${randomToScaleY} ${randomToScaleZ}; dir: alternate; dur: 1800; easing: easeInOutSine; loop: true; delay: ${randomAnimationDelay}`);

            // Color cycle keeps the same order for every orb, but each orb can begin at a different color in that sequence.
            for (let colorStepIndex = 0; colorStepIndex < orbColors.length; colorStepIndex++) {
                const currentColorIndex = (randomStartingColorIndex + colorStepIndex) % orbColors.length;
                const nextColorIndex = (currentColorIndex + 1) % orbColors.length;
                const animationName = `animation__color${colorStepIndex + 1}`;
                const previousAnimationName = colorStepIndex === 0
                    ? `start-color-cycle, animationcomplete__color${orbColors.length}`
                    : `animationcomplete__color${colorStepIndex}`;

                orb.setAttribute(animationName, `property: material.color; from: ${orbColors[currentColorIndex]}; to: ${orbColors[nextColorIndex]}; dur: 1600; easing: easeInOutSine; startEvents: ${previousAnimationName}`);
            }

            // Kick off the color cycle once the entity is ready
            orb.addEventListener('loaded', () => {
                window.setTimeout(() => {
                    if (!orb.parentNode) return;
                    orb.emit('start-color-cycle');
                }, randomAnimationDelay);
            }, { once: true });

            this.el.sceneEl.appendChild(orb);
            this.orbs.push({ el: orb, pos: orbPosition.clone(), collected: false }); // Store orb element, position, and collected state
        });
    },

    createHud: function () {
        const cameraEl = this.el.sceneEl.camera.el;

        // Parent container to camera and position it just below center view
        const hudContainerEl = document.createElement('a-entity');
        hudContainerEl.setAttribute('position', '0 -0.15 -0.6');

        // Transparent background panel
        const hudPanelEl = document.createElement('a-entity');
        hudPanelEl.setAttribute('width', '0.3');
        hudPanelEl.setAttribute('height', '0.07');
        hudContainerEl.appendChild(hudPanelEl);

        // Orb count on the left side
        this.hudOrbCountTextEl = document.createElement('a-text');
        this.hudOrbCountTextEl.setAttribute('value', `0 / ${this.data.count} orbs`);
        this.hudOrbCountTextEl.setAttribute('position', '-0.130 0 0.001');
        this.hudOrbCountTextEl.setAttribute('color', '#FFFFFF');
        this.hudOrbCountTextEl.setAttribute('width', '0.48');
        this.hudOrbCountTextEl.setAttribute('align', 'left');
        this.hudOrbCountTextEl.setAttribute('anchor', 'left'); // starts at x position and extends rightward
        this.hudOrbCountTextEl.setAttribute('baseline', 'center');
        hudContainerEl.appendChild(this.hudOrbCountTextEl);

        // Timer on the right side
        this.hudTimerTextEl = document.createElement('a-text');
        this.hudTimerTextEl.setAttribute('value', '00:00');
        this.hudTimerTextEl.setAttribute('position', '0.130 0 0.001');
        this.hudTimerTextEl.setAttribute('color', '#FFFFFF');
        this.hudTimerTextEl.setAttribute('width', '0.48');
        this.hudTimerTextEl.setAttribute('align', 'right');
        this.hudTimerTextEl.setAttribute('anchor', 'right'); // ends at x position and extends leftward
        this.hudTimerTextEl.setAttribute('baseline', 'center');
        hudContainerEl.appendChild(this.hudTimerTextEl);

        hudContainerEl.setAttribute('visible', false);
        cameraEl.appendChild(hudContainerEl);
        this.hudEl = hudContainerEl;
    },

    // Format time in milliseconds to MM:SS
    formatTime: function (totalMilliseconds) {
        const totalSeconds = Math.floor(totalMilliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    // When an orb is collected, update the HUD and check for completion
    saveScoreToLeaderboard: function (playerTimeMs) {
        const storageKey = 'orb-minigame-scores';
        let savedScores = [];
        // Attempt to retrieve existing scores from localStorage
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) savedScores = JSON.parse(stored);
        } catch (e) {
            savedScores = [];
        }
        // Store both the time and the date the score was set
        const today = new Date();
        const dateDisplay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; // YYYY-MM-DD format
        // Add the new score, sort the list, and keep only the top 10 scores
        savedScores.push({ timeMs: playerTimeMs, date: dateDisplay });
        savedScores.sort((a, b) => a.timeMs - b.timeMs);
        if (savedScores.length > 10) savedScores = savedScores.slice(0, 10);
        // Attempt to save the updated scores back to localStorage
        try {
            localStorage.setItem(storageKey, JSON.stringify(savedScores));
        } catch (e) {
            console.warn('orb-collection-minigame: Could not save score to localStorage');
        }
        return savedScores;
    },

    showLeaderboard: function (playerTimeMs) {
        const scores = this.saveScoreToLeaderboard(playerTimeMs);
        const playerRankIndex = scores.findIndex(s => s.timeMs === playerTimeMs);
        const cameraEl = this.el.sceneEl.camera.el;

        // Fade the HUD out first, then show the leaderboard once it's gone
        const hudFadeOutDurationMs = 500;
        if (this.hudEl) {
            this.hudEl.setAttribute('animation__fadeout', `property: object3D.visible; dur: ${hudFadeOutDurationMs}`);
            // Fade out opacity on the panel child
            const hudChildren = this.hudEl.querySelectorAll('[material], a-text');
            hudChildren.forEach(child => {
                const isText = child.tagName.toLowerCase() === 'a-text';
                const opacityProp = isText ? 'text.opacity' : 'material.opacity';
                child.setAttribute('animation__hudout', `property: ${opacityProp}; to: 0; dur: ${hudFadeOutDurationMs}; easing: easeInSine`);
            });
        }

        // Wait for HUD to finish fading before building the leaderboard
        window.setTimeout(() => {
            if (this.hudEl) this.hudEl.setAttribute('visible', false);

            const leaderboardContainerEl = document.createElement('a-entity');
            leaderboardContainerEl.setAttribute('position', '0 0.05 -1.5');

            // Background panel fades in on load
            const leaderboardPanelEl = document.createElement('a-plane');
            leaderboardPanelEl.setAttribute('width', '0.9');
            leaderboardPanelEl.setAttribute('height', '0.82');
            leaderboardPanelEl.setAttribute('material', 'color: #000020; opacity: 0; transparent: true; shader: flat');
            leaderboardPanelEl.setAttribute('animation__fadein', 'property: material.opacity; from: 0; to: 0.8; dur: 600; easing: easeOutSine');
            leaderboardContainerEl.appendChild(leaderboardPanelEl);

            // Title
            const titleTextEl = document.createElement('a-text');
            titleTextEl.setAttribute('value', 'LEADERBOARD');
            titleTextEl.setAttribute('position', '0 0.34 0.002');
            titleTextEl.setAttribute('color', '#FFFFFF');
            titleTextEl.setAttribute('align', 'center');
            titleTextEl.setAttribute('width', '0.85');
            titleTextEl.setAttribute('opacity', '0');
            titleTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
            leaderboardContainerEl.appendChild(titleTextEl);

            // Column headings
            const headingTextEl = document.createElement('a-text');
            headingTextEl.setAttribute('value', 'DURATION          DATE');
            headingTextEl.setAttribute('position', '-0.030 0.235 0.002');
            headingTextEl.setAttribute('color', '#FFFFFF');
            headingTextEl.setAttribute('align', 'center');
            headingTextEl.setAttribute('width', '0.85');
            headingTextEl.setAttribute('font', 'sourcecodepro');
            headingTextEl.setAttribute('opacity', '0');
            headingTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
            leaderboardContainerEl.appendChild(headingTextEl);

            // Keep refs to all text elements so we can fade them out together later
            const allLeaderboardTextEls = [titleTextEl, headingTextEl];

            // Ten score rows — each shows how long it took to complete and when
            for (let rankIndex = 0; rankIndex < 10; rankIndex++) {
                const score = scores[rankIndex];
                const isPlayerEntry = rankIndex === playerRankIndex;
                const durationDisplay = score ? this.formatTime(score.timeMs) : '00:00';
                const dateDisplay = score && score.date ? score.date : '2015-10-21'; // Default date is Back to the Future day
                const rowText = `${String(rankIndex + 1).padStart(2)}.  ${durationDisplay}       ${dateDisplay}`;
                const rowYPosition = (0.175 - rankIndex * 0.055).toFixed(3);

                const rowTextEl = document.createElement('a-text');
                rowTextEl.setAttribute('value', rowText);
                // Slight nudge to the left for the 10th place entry so the text doesn't look off-center with the extra digit
                if (rankIndex === 9) {
                    rowTextEl.setAttribute('position', `-0.01 ${rowYPosition} 0.002`);
                } else {
                    rowTextEl.setAttribute('position', `0 ${rowYPosition} 0.002`);
                }
                rowTextEl.setAttribute('color', isPlayerEntry ? '#5CFDCA' : '#FFFFFF');
                rowTextEl.setAttribute('align', 'center');
                rowTextEl.setAttribute('width', '0.85');
                rowTextEl.setAttribute('font', 'sourcecodepro');
                rowTextEl.setAttribute('opacity', '0');
                rowTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
                leaderboardContainerEl.appendChild(rowTextEl);
                allLeaderboardTextEls.push(rowTextEl);
            }

            cameraEl.appendChild(leaderboardContainerEl);
            this.leaderboardEl = leaderboardContainerEl;

            // After 15 seconds, fade out the panel and all text, then remove the entity
            const fadeOutDurationMs = 800;
            window.setTimeout(() => {
                if (!this.leaderboardEl) return;
                leaderboardPanelEl.setAttribute('animation__fadeout', `property: material.opacity; from: 0.8; to: 0; dur: ${fadeOutDurationMs}; easing: easeInSine`);
                allLeaderboardTextEls.forEach(textEl => {
                    textEl.setAttribute('animation__fadeout', `property: text.opacity; from: 1; to: 0; dur: ${fadeOutDurationMs}; easing: easeInSine`);
                });
                window.setTimeout(() => {
                    if (this.leaderboardEl && this.leaderboardEl.parentNode) {
                        this.leaderboardEl.parentNode.removeChild(this.leaderboardEl);
                        this.leaderboardEl = null;
                    }
                }, fadeOutDurationMs + 100);
            }, 15000);
        }, hudFadeOutDurationMs + 100);
    },

    tick: function () {
        if (!this.orbs.length || this.hasCollectedAllOrbs) return; // Exit if no orbs or game is already completed

        // Only check for orb collection every 10 frames for performance
        this.tickFrameCounter++;
        if (this.tickFrameCounter < 10) return;
        this.tickFrameCounter = 0;

        // Setup vars
        const sceneCamera = this.el.sceneEl.camera;
        if (!sceneCamera) return;
        sceneCamera.getWorldPosition(this.cameraWorldPosition); // Update this.cameraWorldPosition each frame to keep track of where the player is in the world
        const collectRadiusSquared = this.data.collectRadius * this.data.collectRadius;

        // Update HUD timer while the game is in progress
        if (this.gameStartTime !== null && this.hudTimerTextEl) {
            this.hudTimerTextEl.setAttribute('value', this.formatTime(Date.now() - this.gameStartTime));
        }

        // Check each orb to see if the player is within collect radius.  If so, mark orb as collected, hide it, and play sounds as needed.
        for (const orb of this.orbs) {
            // If orb is already collected, skip to the next one.
            if (orb.collected) continue;
            // If the player is too far from the orb, skip to the next one.
            const deltaX = this.cameraWorldPosition.x - orb.pos.x;
            const deltaY = this.cameraWorldPosition.y - orb.pos.y;
            const deltaZ = this.cameraWorldPosition.z - orb.pos.z;
            if (deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ > collectRadiusSquared) continue;
            // Player is within collect radius of this orb, mark it as collected and hide it
            orb.collected = true;
            orb.el.setAttribute('visible', false);
            this.collected++;

            // On the first orb: start the timer and show the HUD
            if (this.collected === 1) {
                this.gameStartTime = Date.now();
                if (this.hudEl) this.hudEl.setAttribute('visible', true);
            }

            // Update orb count display on HUD
            if (this.hudOrbCountTextEl) {
                this.hudOrbCountTextEl.setAttribute('value', `${this.collected} / ${this.orbs.length} orbs`);
            }

            // Play collect sound if specified
            if (this.data.collectSound) {
                const collectSoundEl = document.querySelector(this.data.collectSound);
                if (collectSoundEl && collectSoundEl.components && collectSoundEl.components.sound) {
                    collectSoundEl.components.sound.playSound();
                }
            }

            // If all orbs are collected, freeze timer, show leaderboard, and play victory sound
            if (this.collected >= this.orbs.length) {
                this.hasCollectedAllOrbs = true;
                const finalTimeMs = Date.now() - this.gameStartTime;

                if (this.hudTimerTextEl) {
                    this.hudTimerTextEl.setAttribute('value', this.formatTime(finalTimeMs));
                }

                // Show the leaderboard with the player's final time
                this.showLeaderboard(finalTimeMs);

                // Play all collected sound if specified
                if (this.data.allCollectedSound) {
                    const allCollectedSoundEl = document.querySelector(this.data.allCollectedSound);
                    if (allCollectedSoundEl && allCollectedSoundEl.components && allCollectedSoundEl.components.sound) {
                        allCollectedSoundEl.components.sound.playSound();
                    }
                }
                return;
            }
        }
    },

    remove: function () {
        // Remove orbs if component is removed from the scene
        this.orbs.forEach(orb => {
            if (orb.el && orb.el.parentNode) orb.el.parentNode.removeChild(orb.el);
        });
        this.orbs = [];
        this.hasCollectedAllOrbs = false;
        // Remove HUD and leaderboard if they exist
        if (this.hudEl && this.hudEl.parentNode) {
            this.hudEl.parentNode.removeChild(this.hudEl);
            this.hudEl = null;
        }
        if (this.leaderboardEl && this.leaderboardEl.parentNode) {
            this.leaderboardEl.parentNode.removeChild(this.leaderboardEl);
            this.leaderboardEl = null;
        }
    }
});
