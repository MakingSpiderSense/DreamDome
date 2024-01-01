# Dream Dome

## Description

This project is a synthwave-inspired space that acts as a sandbox to explore the capabilities of A-frame.

## Project Status

This project is currently a personal showcase of my work in A-frame and is not open for collaboration or pull requests. Feel free to explore and learn from the code!

## Dependencies

- `aframe-environment-component` - Creates the sky and ground. However, we are using a custom sky.
- `aframe-extras` - Used for the `movement-controls` component which allows for smooth locomotion.
- `aframe-aabb-collider-component` - Used for the collision detection.
    - Used to detect when the user is close to the elevator door, triggering the door to open.
- `aframe-physics-system` - Used for the physics system.

## Additional Notes

- The `nav-mesh.html` file is purely used for generating the nav mesh, which can be done in the A-Frame inspector via the `inspector-plugin-recast` component.