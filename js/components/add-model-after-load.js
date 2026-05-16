/**
 * Add Model After Load
 *
 * Description: This component loads a GLTF model and adds an ammo-shape to it after the model is loaded. It's a workaround to use Ammo.js physics with 3D models.
 *
 * Credit: Based on snippet from icurtis1 🙏 (https://github.com/n5ro/aframe-physics-system/issues/192)
 *
 */
const addModelAfterLoad = {
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
};
AFRAME.registerComponent('add-model-after-load', addModelAfterLoad);