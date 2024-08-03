# Dream Dome

## Description

This project is a synthwave-inspired space that acts as a sandbox to explore the capabilities of A-frame. It is currently a personal showcase of my work in A-frame and is not open for collaboration or pull requests. Feel free to explore and learn from the code!

https://makingspidersense.com/vr/

Dream Dome has been primarily tested with the Quest 3 and occasionally with the Quest 2. It should also work through the browser using the `WASD` keys and mouse. A dedicated graphics card is recommended for the best experience. Make sure your browser has hardware acceleration enabled so that the graphics card is used. Tested with a RTX 2070 Super.

## Features

- **Raycaster System:** The raycaster system is used to interact with objects in the environment. Users can switch which hand is projecting the raycaster or hide it. On desktop, a reticle is used instead. Both the raycaster beam and reticle have a visual change when they intersect with an interactable object. A slight haptic vibration is also triggered in the controllers when intersecting with an object.
- **Speaker:** There's a large speaker designed like a Bluetooth tube speaker. Pressing the power button activates it and starts playing music.
- **Elevator:** The elevator offers several unique experiences. "Skybox Tour" involves a journey upwards and then a lateral movement in a box shape before descending. "Cosmo Climb" ascends straight up for a panoramic view. "Gravity Rush" is a thrilling drop, three times higher than Six Flags' Giant Drop. There's also a hidden "Skydive" option, simulating a 4,000 meter free fall. Search for a flat, square, pink button on the control panel that doesn't appear to be functional. "Gravity Rush" and "Skydive" **should only be attempted** by those who are not prone to motion sickness.

## Dependencies

- `aframe-environment-component` - Creates the sky and ground. However, we are using a custom sky ([GitHub](https://github.com/supermedium/aframe-environment-component)).
- `aframe-extras` - Used for the `movement-controls` component which allows for smooth locomotion ([GitHub](https://github.com/c-frame/aframe-extras)).
- `aframe-aabb-collider-component` - Used for the collision detection ([GitHub](https://github.com/supermedium/superframe/tree/master/components/aabb-collider/)).
    - Used to detect when the user is close to the elevator door, triggering the door to open.
- `aframe-physics-system` - Used for the physics system ([GitHub](https://github.com/c-frame/aframe-physics-system)).
    - `ammo.js` - Used for the physics engine ([GitHub](https://github.com/c-frame/aframe-physics-system/blob/master/AmmoDriver.md)).
- `aframe-particle-system` - Used for the particle system ([GitHub](https://github.com/c-frame/aframe-particle-system-component)).
- `aframe-haptics-component` - Used for haptic feedback on the controllers ([GitHub](https://github.com/supermedium/superframe/tree/master/components/haptics/)).

## Additional Notes

- The `nav-mesh.html` file is purely used for generating the nav mesh, which can be done in the A-Frame inspector via the `inspector-plugin-recast` component.