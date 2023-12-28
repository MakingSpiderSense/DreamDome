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
    init: function () {
        const el = this.el;
        const elevatorEl = document.querySelector('#elevator');
        const cameraEl = document.querySelector('.user');
        const mainCameraEl = cameraEl.querySelector('#cameraRig');

        el.addEventListener('click', () => {
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

    startElevatorTrip: function (elevatorEl, cameraEl) {
        const mainCameraEl = cameraEl.querySelector('#cameraRig');
        const elevatorElX = elevatorEl.getAttribute('position').x;
        const elevatorElY = elevatorEl.getAttribute('position').y;
        const elevatorElZ = elevatorEl.getAttribute('position').z;
        // Move user to center of elevator. Since they can't move, this is just for a consistent starting point.
        cameraEl.setAttribute('position', { x: elevatorElX, y: elevatorElY, z: elevatorElZ });
        // Define the sequence of movements
        const movements = [
            { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ }, // Up
            { x: elevatorElX + 20, y: elevatorElY + 20, z: elevatorElZ }, // Right
            { x: elevatorElX + 20, y: elevatorElY + 20, z: elevatorElZ + 20  }, // Back
            { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ + 20  }, // Left
            { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ  }, // Forward
            { x: elevatorElX, y: elevatorElY, z: elevatorElZ  } // Down
        ];

        let movementIndex = 0;

        const moveElevator = () => {
            if (movementIndex >= movements.length) {
                return; // End of trip
            }

            const targetPos = movements[movementIndex];
            const duration = 5000; // Duration for each movement

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
        console.log('blink shut');
        // Close all eyes (multiple cameras)
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
        console.log('blink open');
        // Open all eyes (multiple cameras)
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