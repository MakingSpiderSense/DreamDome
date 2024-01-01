# Dream Dome

## Description

This project is a synthwave-inspired space that acts as a sandbox to explore the capabilities of A-frame. It is currently a personal showcase of my work in A-frame and is not open for collaboration or pull requests. Feel free to explore and learn from the code!

## Features

- **Speaker:** There's a large speaker designed like a Bluetooth tube speaker. Pressing the power button activates it and starts playing music.
- **Elevator:** The elevator offers several unique experiences. "Skybox Tour" involves a journey upwards and then a lateral movement in a box shape before descending. "Cosmo Climb" ascends straight up for a panoramic view. "Gravity Rush" is a thrilling drop, three times higher than Six Flags' Giant Drop. There's also a hidden "Skydive" option, simulating a 4,000 meter free fall. Search for a flat, pink button on the control panel that doesn't appear to be functional. "Gravity Rush" and "Skydive" **should only be attempted** by those who are not prone to motion sickness.

## Dependencies

- `aframe-environment-component` - Creates the sky and ground. However, we are using a custom sky.
- `aframe-extras` - Used for the `movement-controls` component which allows for smooth locomotion.
- `aframe-aabb-collider-component` - Used for the collision detection.
    - Used to detect when the user is close to the elevator door, triggering the door to open.
- `aframe-physics-system` - Used for the physics system.

## Additional Notes

- The `nav-mesh.html` file is purely used for generating the nav mesh, which can be done in the A-Frame inspector via the `inspector-plugin-recast` component.