// A-frame Components

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
        // Make the elevator floor nearly invisible during the trip.
        elevatorFloorEl.setAttribute('material', 'color', '#252d2c'); // This is to help with the transition
        elevatorFloorEl.setAttribute('animation__color', {
            property: 'material.color',
            to: '#ffffff',
            dur: 2000
        });
        elevatorFloorEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.1,
            dur: 2000
        });
        elevatorFloorEl.setAttribute('material', 'src', null);

        // Elevator movements
        let movements;
        switch (this.data.rideType) {
            case 'cosmo-climb':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 10, z: elevatorElZ, duration: 2720, easing: 'easeInQuad' }, // Up (ease start)
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 19000 }, // Up
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 5000 }, // Hold position in sky
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
                    { x: elevatorElX, y: elevatorElY + 200, z: elevatorElZ, duration: 5000  }, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY + 5, z: elevatorElZ, duration: 6300, easing: 'easeInCubic', sounds: [{ id: 'sound-falling-1' }] }, // Gravity Fall
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 1250, easing: 'easeOutCubic', sounds: [{ id: 'sound-falling-1' }] } // Down (ease finish)
                ];
                break;
            case 'skydive':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 4000, z: elevatorElZ, duration: 1 }, // Up
                    { x: elevatorElX, y: elevatorElY + 4000, z: elevatorElZ, duration: 500 }, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 28571, easing: 'easeInCubic', sounds: [{ id: 'sound-falling-1', delay: 24271 }] }, // Gravity Fall
                    { x: elevatorElX, y: elevatorElY - 10, z: elevatorElZ, duration: 1000, easing: 'linear', sounds: [{ id: 'sound-plunge' }] }, // Resistance
                    { x: elevatorElX, y: elevatorElY - 165, z: elevatorElZ, duration: 8380, easing: 'easeOutCubic' }, // Water Fall
                    { x: elevatorElX, y: elevatorElY - 165, z: elevatorElZ, duration: 2000 }, // Hold position
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
            if (movementIndex >= movements.length) {
                // Stop all sounds at the end of the ride
                stopAllSounds();
                // Restore elevator door trigger position
                elevatorDoorTriggerEl.setAttribute('position', { x: elevatorDoorTriggerElX, y: elevatorDoorTriggerElY, z: elevatorDoorTriggerElZ });
                // Restore the elevator floor
                elevatorFloorEl.setAttribute('animation__color', {
                    property: 'material.color',
                    to: '#252d2c',
                    dur: 1000
                });
                elevatorFloorEl.setAttribute('animation__opacity', {
                    property: 'material.opacity',
                    to: 1,
                    dur: 500
                });
                setTimeout(() => {
                    elevatorFloorEl.setAttribute('material', 'src', '#speaker');
                    elevatorFloorEl.setAttribute('material', 'color', 'gray');
                }, 1050);
                // Restore the elevator state
                const elevatorController = document.querySelector('#elevator').components['elevator-controller'];
                elevatorController.data.isMoving = false;
                return; // End of trip
            }

            const targetPos = movements[movementIndex];
            const duration = targetPos.duration; // Duration for each movement
            const sounds = targetPos.sounds || [{ id: 'sound-moving' }]; // Default to 'sound-moving'

            // Play all sounds for the current movement
            playSounds(sounds);

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
