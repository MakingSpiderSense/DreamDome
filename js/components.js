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


AFRAME.registerComponent('elevator-trip-2', {
    init: function () {
        const el = this.el;
        const elevatorEl = document.querySelector('#elevator');
        const cameraEl = document.querySelector('.user');

        el.addEventListener('click', () => {
            // Start the elevator trip
            this.startElevatorTrip(elevatorEl, cameraEl);
        });
    },

    startElevatorTrip: function (elevatorEl, cameraEl) {
        const elevatorElX = elevatorEl.getAttribute('position').x;
        const elevatorElY = elevatorEl.getAttribute('position').y;
        const elevatorElZ = elevatorEl.getAttribute('position').z;
        // Animate elevator going up
        elevatorEl.setAttribute('animation', {
            property: 'position',
            to: { x: elevatorElX, y: elevatorElY + 20, z: elevatorElZ },
            dur: 5000,
            easing: 'linear'
        });
        // Animation for camera going up
        cameraEl.setAttribute('animation', {
            property: 'position',
            to: { y: 20 },
            dur: 5000,
            easing: 'linear'
        });

        // After reaching the top, animate going back down
        setTimeout(() => {
            // Animate elevator going down
            elevatorEl.setAttribute('animation', {
                property: 'position',
                to: { x: elevatorElX, y: elevatorElY, z: elevatorElZ },
                dur: 5000,
                easing: 'linear'
            });
            // Animation for camera going down
            cameraEl.setAttribute('animation', {
                property: 'position',
                to: { y: 0 },
                dur: 5000,
                easing: 'linear'
            });
        }, 5000); // This timeout should match the duration of the up animation
    }
});

AFRAME.registerComponent('elevator-trip-3', {
    init: function () {
        const el = this.el;
        const elevatorEl = document.querySelector('#elevator');
        const cameraEl = document.querySelector('.user');

        el.addEventListener('click', () => {
            // Start the elevator trip
            this.startElevatorTrip(elevatorEl, cameraEl);
        });
    },

    startElevatorTrip: function (elevatorEl, cameraEl) {
        const elevatorElX = elevatorEl.getAttribute('position').x;
        const elevatorElY = elevatorEl.getAttribute('position').y;
        const elevatorElZ = elevatorEl.getAttribute('position').z;
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

            movementIndex++;
            setTimeout(moveElevator, duration);
        };

        moveElevator();
    }
});


// Version with camera as child of elevator
AFRAME.registerComponent('elevator-trip', {
    init: function () {
        const el = this.el;
        const elevatorEl = document.querySelector('#elevator');
        const cameraEl = document.querySelector('.user');
        const mainCameraEl = cameraEl.querySelector('#cameraRig');

        el.addEventListener('click', () => {
            const secondCameraEl = document.querySelector('.user-2 #cameraRig2');
            console.log(mainCameraEl.getAttribute('rotation'));
            console.log(secondCameraEl.getAttribute('rotation'));
            // Set the position and direction of the second camera to match the main camera
            secondCameraEl.setAttribute('position', {
                x: cameraEl.getAttribute('position').x - elevatorEl.getAttribute('position').x,
                y: 1.7,
                z: cameraEl.getAttribute('position').z - elevatorEl.getAttribute('position').z
            });
            setTimeout(() => {
                secondCameraEl.setAttribute('camera', 'active', true);
                // Start the elevator trip
                this.startElevatorTrip(elevatorEl, cameraEl);
            }, 500);
        });
    },

    startElevatorTrip: function (elevatorEl, cameraEl) {
        const mainCameraEl = cameraEl.querySelector('#cameraRig');
        const elevatorElX = elevatorEl.getAttribute('position').x;
        const elevatorElY = elevatorEl.getAttribute('position').y;
        const elevatorElZ = elevatorEl.getAttribute('position').z;
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
                var secondCameraEl = document.querySelector('.user-2 #cameraRig2');
        
                // Get the final position and rotation of the second camera
                const secondCameraPos = secondCameraEl.getAttribute('position');
                // Set the position and direction of the main camera to match the second camera
                const newCameraPos = {
                    x: secondCameraPos.x + elevatorEl.getAttribute('position').x,
                    y: .1,
                    z: secondCameraPos.z + elevatorEl.getAttribute('position').z
                };
                // Set the position and rotation of the main camera to match the second camera
                cameraEl.setAttribute('position', newCameraPos);
                console.log(mainCameraEl.getAttribute('rotation'));
                console.log(secondCameraEl.getAttribute('rotation'));
                mainCameraEl.setAttribute('rotation', secondCameraEl.getAttribute('rotation'));
                // Reset camera controls back to original camera
                // FIX THIS!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                // The mainCameraEl rotation always ends up being the starting rotation before the trip! Needs to update to whatever the second camera's rotation is at the end of the trip.
                setTimeout(() => {
                    mainCameraEl.object3D.rotation.set(
                        THREE.MathUtils.degToRad(secondCameraEl.getAttribute('rotation').x),
                        THREE.MathUtils.degToRad(secondCameraEl.getAttribute('rotation').y),
                        THREE.MathUtils.degToRad(secondCameraEl.getAttribute('rotation').z)
                    );
                    // mainCameraEl.setAttribute('rotation', secondCameraEl.getAttribute('rotation'));
                    console.log(mainCameraEl.getAttribute('rotation'));
                    console.log(secondCameraEl.getAttribute('rotation'));
                    // Reactivate the main camera
                    secondCameraEl.setAttribute('camera', 'active', false);
                    // mainCameraEl.setAttribute('camera', 'active', true);
                }, 3000);
                // secondCameraEl.setAttribute('camera', 'active', false);
                return; // End of trip
            }

            const targetPos = movements[movementIndex];
            const duration = 500; // Duration for each movement

            // Move Elevator
            elevatorEl.setAttribute('animation', {
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

    // Function to remove and then reattach control components
    resetCameraControls: function(cameraEl) {
        // Remove the control components
        cameraEl.removeAttribute('wasd-controls');
        cameraEl.removeAttribute('look-controls');

        // Add them back after a brief timeout
        setTimeout(() => {
            cameraEl.setAttribute('wasd-controls', {});
            cameraEl.setAttribute('look-controls', {});
        }, 100); // 100 milliseconds delay
    }
});
