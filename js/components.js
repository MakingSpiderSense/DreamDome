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
                return; // End of trip
            }

            // Start the ride
            const targetPos = movements[movementIndex];
            const duration = targetPos.duration; // Duration for each movement
            const sounds = targetPos.sounds || [{ id: 'sound-moving' }]; // Default to 'sound-moving'

            // Disable movement
            cameraEl.setAttribute('movement-controls', { enabled: false });

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


AFRAME.registerComponent('arm-swing-movement', {
    schema: {
        leftController: {type: 'selector', default: null},
        rightController: {type: 'selector', default: null},
        speedFactor: {type: 'number', default: 1}, // multiplier for movement speed
        smoothingTime: {type: 'number', default: 1000}, // in ms; time to transition speed
        minSpeed: {type: 'number', default: 1}, // minimum speed to consider the user moving
        swingTimeout: {type: 'number', default: 700} // time in ms to wait before stopping movement when no new swings are detected
    },
    init: function() {
        console.log('Arm Swing Movement Component Initialized v1.5');
        this.hands = {
            left: {entity: this.data.leftController, lastZ: null, lastDirection: null, lastSwingTime: null, recentSwings: []},
            right: {entity: this.data.rightController, lastZ: null, lastDirection: null, lastSwingTime: null, recentSwings: []}
        };
        this.currentSpeed = 0;
        this.threshold = 0.01; // minimum change/frame in meters in z direction to consider movement
        this.moving = false; // flag to track whether the user is moving
    },
    tick: function(time, deltaTime) {
        // If controllers not provided, try to find them.
        if (!this.hands.left.entity) {
            let leftEl = this.el.sceneEl.querySelector('[oculus-touch-controls][hand="left"]');
            if (leftEl) {this.hands.left.entity = leftEl;}
        }
        if (!this.hands.right.entity) {
            let rightEl = this.el.sceneEl.querySelector('[oculus-touch-controls][hand="right"]');
            if (rightEl) {this.hands.right.entity = rightEl;}
        }
        // Process each hand.
        for (let handKey in this.hands) {
            let hand = this.hands[handKey];
            if (!hand.entity) {continue;}
            let worldPos = new THREE.Vector3();
            hand.entity.object3D.getWorldPosition(worldPos);
            // Convert world position to rig's (this.el) local space.
            let currentZ;
            if (this.el.debugDirectionVec) {
                // If the direction vector is set, use it to calculate the Z position.
                let rigPos = new THREE.Vector3();
                this.el.object3D.getWorldPosition(rigPos);
                let relativePos = worldPos.clone().sub(rigPos);
                currentZ = relativePos.dot(this.el.debugDirectionVec);
            } else {
                let localPos = this.el.object3D.worldToLocal(worldPos.clone());
                currentZ = localPos.z;
            }
            if (hand.lastZ === null) {hand.lastZ = currentZ; continue;}
            let diff = currentZ - hand.lastZ;
            let newDirection = hand.lastDirection;
            if (diff > this.threshold) {newDirection = 'positive';}
            else if (diff < -this.threshold) {newDirection = 'negative';}
            // When a direction reversal is detected, record a swing event.
            if (hand.lastDirection && newDirection && newDirection !== hand.lastDirection) {
                if (hand.lastSwingTime !== null) {
                    let period = time - hand.lastSwingTime;
                    // If the period is less than 150ms, ignore it - it's nearly impossible and probably a controller shake.
                    if (period > 150) {
                        hand.recentSwings.push(period);
                        if (hand.recentSwings.length > 6) {hand.recentSwings.shift();}
                    }
                }
                hand.lastSwingTime = time;
            }
            hand.lastDirection = newDirection;
            hand.lastZ = currentZ;
        }
        // Clear recentSwings if no new swings are detected within swingTimeout.
        for (let handKey in this.hands) {
            let hand = this.hands[handKey];
            if (hand.lastSwingTime !== null && (time - hand.lastSwingTime > this.data.swingTimeout)) {
                hand.recentSwings = [];
                hand.lastSwingTime = null;
                hand.lastDirection = null;
            }
        }
        // Calculate average swing time from both hands.
        let recentSwings = [];
        for (let handKey in this.hands) {
            recentSwings = recentSwings.concat(this.hands[handKey].recentSwings);
        }
        // Make sure there are at least 12 swings and none are zero. If so, add or update 0 swings to 2000ms.
        const recentSwingsLength = recentSwings.length;
        recentSwings = recentSwings.filter(swingTime => swingTime > 0);
        if (recentSwingsLength < 12) {
            // Push until we have 12 swings.
            let numToAdd = 12 - recentSwingsLength;
            for (let i = 0; i < numToAdd; i++) {
                recentSwings.push(2000); // Add 2000ms to fill the array.
            }
        }
        let avgSwingTime = 0; // Time it takes to swing arms back to forward and vice versa (direction reversals).
        // Reduce array to sum of swing times and divide by length to get average.
        avgSwingTime = recentSwings.reduce((sum, swingTime) => sum + swingTime, 0) / recentSwings.length;
        // Compute target speed based on swing frequency (if no swings, target speed is 0).
        let targetSpeed = 0;
        const stepsPerSecond = 1000 / avgSwingTime; // Convert avgSwingTime to steps/second, assuming an arm swing is a step.
        if (avgSwingTime > 0) {
            // Use the custom formula based on real-world data: y = 3.45 * x - 3.95, where x is steps/sec and y is speed (m/s).
            targetSpeed = 3.45 * stepsPerSecond - 3.95;
            // Multiply by speedFactor to adjust speed
            targetSpeed *= this.data.speedFactor;
        }
        // If the computed speed is below the minimum, stop moving.
        if (targetSpeed < this.data.minSpeed) {
            targetSpeed = 0;
            this.moving = false;
        } else {
            this.moving = true;
        }
        // Smoothly interpolate current speed toward target speed.
        this.currentSpeed += (targetSpeed - this.currentSpeed) * (deltaTime / this.data.smoothingTime);
        // Debugging: Output speed
        console.log(`Steps/sec: ${stepsPerSecond.toFixed(1)}, Target m/s: ${targetSpeed.toFixed(1)}, Current m/s: ${this.currentSpeed.toFixed(1)}, lastZLeft: ${this.hands.left.lastZ.toFixed(2)}, lastDirectionLeft: ${this.hands.left.lastDirection}, lastZRight: ${this.hands.right.lastZ.toFixed(2)}, lastDirectionRight: ${this.hands.right.lastDirection}`);
        // Move the rig forward.
        let distance = this.currentSpeed * (deltaTime / 1000);
        let forward = new THREE.Vector3();
        if (this.el.debugDirectionVec) {
            // Use direction from direction‑shift if available
            forward.copy(this.el.debugDirectionVec).negate();
        } else {
            // Fallback if no direction-shift component is present
            this.el.object3D.getWorldDirection(forward);
            // Update rig's position by moving it forward.
            forward.negate();
        }
        // If movement-controls is using nav-mesh, clamp movement to mesh
        let mc = this.el.components['movement-controls'];
        let navsys = this.el.sceneEl.systems.nav;
        if (mc && mc.data.constrainToNavMesh && navsys) {
            let start = this.el.object3D.position.clone(); // Grab rig's current world‑position and make a copy to do the math on
            let end = start.clone().add(forward.clone().multiplyScalar(distance)); // Compute the *desired* end position by moving “forward” by your computed distance
            // Set to movement-controls' navNode and navGroup to the ones that are currently in use, or get them from the nav-mesh system.
            let navGroup = mc.navGroup || navsys.getGroup(start);
            let navNode  = mc.navNode  || navsys.getNode(start, navGroup);
            let clampedEnd = new THREE.Vector3(); // Prepare an empty vector to receive the *clamped* end point.
            let newNavNode = navsys.clampStep(start, end, navGroup, navNode, clampedEnd); // Ask the nav‑mesh system to clamp your straight‑line move onto the mesh surface.
            this.el.object3D.position.copy(clampedEnd);
            // Sync the movement-controls component's navNode and navGroup to the new ones.
            mc.navGroup = navGroup;
            mc.navNode = newNavNode;
        } else {
            // Default unconstrained movement
            this.el.object3D.position.add(forward.multiplyScalar(distance));
        }
    }
});


AFRAME.registerComponent('direction-shift', {
    schema: {
        sampleInterval: { type: 'number', default: 100 }, // Milliseconds between samples
        bufferSize: { type: 'int', default: 10 } // Number of samples to store in buffer
    },
    init: function () {
        // Controller arrows (left and right)
        this.controllerArrows = Array.from(this.el.querySelectorAll('.controller-arrow'));
        // Main debug arrow
        this.debugArrow = this.el.querySelector('.debug-arrow');
        // Buffer of recent samples and sampling timer
        this.samples = [];
        this.timeSinceLastSample = 0;
    },
    tick: function (time, timeDelta) {
        this.timeSinceLastSample += timeDelta;
        // Wait until the next sample interval
        if (this.timeSinceLastSample < this.data.sampleInterval) return;
        // Reset the sample timer
        this.timeSinceLastSample -= this.data.sampleInterval;
        const directions = [];
        // Collect each arrow's forward direction
        for (const arrowEl of this.controllerArrows) {
            if (!arrowEl) continue; // Skip if missing
            const dir = new THREE.Vector3();
            arrowEl.object3D.getWorldDirection(dir); // Get world -Z axis
            dir.y = 0;
            dir.normalize(); // Project onto XZ plane
            directions.push(dir);
        }
        if (directions.length === 0) return; // Nothing to average
        // Average direction of both controllers
        const avgDir = directions
            .reduce((acc, v) => acc.add(v), new THREE.Vector3())
            .divideScalar(directions.length)
            .normalize();
        // Store averaged sample in buffer
        this.samples.push(avgDir.clone());
        // Maintain a fixed-length ring buffer
        if (this.samples.length > this.data.bufferSize) {
            this.samples.shift();
        }
        // Average direction over the buffer
        const sum = this.samples
            .reduce((acc, v) => acc.add(v), new THREE.Vector3())
            .divideScalar(this.samples.length);
        // Compute yaw in degrees (world space)
        const worldYaw = Math.atan2(sum.x, sum.z) * (180 / Math.PI);
        // Convert to rig-local yaw so arrow stays aligned regardless of rig rotation
        const rigYaw = this.el.object3D.rotation.y * (180 / Math.PI); // Radians to degrees
        const localYaw = worldYaw - rigYaw;
        // Orient the debug arrow based on averaged controller direction
        this.debugArrow.setAttribute('rotation', { x: 0, y: localYaw, z: 0 });
        // Store direction data on the rig element for other components
        this.el.debugDirectionYaw = worldYaw; // Degrees relative to scene
        this.el.debugDirectionVec = sum.clone(); // Normalized XZ vector
        // Log direction to console
        // console.log('Debug Direction - Yaw (deg):', worldYaw, ' Vector:', sum.x.toFixed(3), sum.z.toFixed(3));
    }
});
