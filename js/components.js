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
        const soundEntity = document.querySelector('#elevator');

        el.addEventListener('click', () => {
            // Blink
            cameraEl.components['blink-control'].showEyelids(mainCameraEl);
            cameraEl.components['blink-control'].blinkShut();
            setTimeout(() => {
                // Start the elevator trip
                this.startElevatorTrip(elevatorEl, cameraEl, soundEntity);
                cameraEl.components['blink-control'].blinkOpen();
                setTimeout(() => {
                    cameraEl.components['blink-control'].hideEyelids(mainCameraEl);
                }, 150);
            }, 500);
        });
    },
    // Start the elevator trip
    startElevatorTrip: function (elevatorEl, cameraEl, soundEntity) {
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
            to: 'white',
            dur: 2000
        });
        elevatorFloorEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            to: 0.2,
            dur: 2000
        });
        elevatorFloorEl.setAttribute('material', 'src', null);
        // Play the elevator sound loop
        soundEntity.components.sound.playSound();
        // Elevator movements
        let movements;
        switch (this.data.rideType) {
            case 'cosmo-climb':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 20000 }, // Up
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 5000 }, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 20000 } // Down
                ];
                break;
            case 'skybox-tour':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ, duration: 5000 }, // Up
                    { x: elevatorElX + 20, y: elevatorElY + 20, z: elevatorElZ, duration: 5000 }, // Right
                    { x: elevatorElX + 20, y: elevatorElY + 20, z: elevatorElZ + 20, duration: 5000 }, // Back
                    { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ + 20, duration: 5000 }, // Left
                    { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ, duration: 5000 }, // Forward
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 5000 } // Down
                ];
                break;
            case 'gravity-rush':
                movements = [
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 20000 }, // Up
                    { x: elevatorElX, y: elevatorElY + 150, z: elevatorElZ, duration: 5000 }, // Hold position in sky
                    { x: elevatorElX, y: elevatorElY + 100, z: elevatorElZ, duration: 350 }, // Down
                    { x: elevatorElX, y: elevatorElY + 55, z: elevatorElZ, duration: 250 }, // Down (picking up speed)
                    { x: elevatorElX, y: elevatorElY + 10, z: elevatorElZ, duration: 200 }, // Down (picking up speed)
                    { x: elevatorElX, y: elevatorElY, z: elevatorElZ, duration: 2500 } // Down (slow finish)
                ];
                break;
        }

        let movementIndex = 0;

        const moveElevator = () => {
            if (movementIndex >= movements.length) {
                // Restore elevator door trigger position
                elevatorDoorTriggerEl.setAttribute('position', { x: elevatorDoorTriggerElX, y: elevatorDoorTriggerElY, z: elevatorDoorTriggerElZ });
                // Stop the elevator sound
                soundEntity.components.sound.stopSound();
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
                return; // End of trip
            }

            const targetPos = movements[movementIndex];
            const duration = targetPos.duration; // Duration for each movement

            // Move Elevator
            elevatorEl.setAttribute('animation', {
                property: 'position',
                to: targetPos,
                dur: duration,
                easing: 'linear'
            });
            // Move Camera
            cameraEl.setAttribute('animation', {
                property: 'position',
                to: targetPos,
                dur: duration,
                easing: 'linear'
            });

            movementIndex++;
            setTimeout(moveElevator, duration);
        };

        moveElevator();
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
