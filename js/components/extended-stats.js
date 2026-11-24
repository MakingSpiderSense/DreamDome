AFRAME.registerComponent('extended-stats', {
    init: function () {
        // Create the additional stats panel.
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed;
            top: 45px;
            left: 0;
            width: 180px;
            padding: 10px;
            background: rgba(40, 40, 45, 0.85);
            color: white;
            font: 12px/1.5 monospace;
            white-space: pre;
            pointer-events: none;
            z-index: 10000;
        `;
        document.body.appendChild(this.panel);
        // Update the panel only four times per second.
        this.tock = AFRAME.utils.throttleTick(this.tock, 250, this);
    },
    tock: function () {
        const info = this.el.renderer.info;
        // Note: This returns a slightly different count than the old stats component did (pre 1.8.0)
        const entities = Array.from(this.el.querySelectorAll('*')).filter(el => el.isEntity).length;
        this.panel.innerHTML = [
            `<span style="color: #90caf9;">Three.js - Render</span>`,
            `Triangles:  ${info.render.triangles.toLocaleString()}`,
            `Draw calls: ${info.render.calls}`,
            `Points:     ${info.render.points}`,
            `Lines:      ${info.render.lines}`,
            "",
            `<span style="color: #90caf9;">Three.js - Memory</span>`,
            `Textures:   ${info.memory.textures}`,
            `Programs:   ${info.programs?.length ?? 0}`,
            `Geometries: ${info.memory.geometries}`,
            "",
            `<span style="color: #90caf9;">A-Frame</span>`,
            `Entities:   ${entities}`
        ].join("\n");
    },
    remove: function () {
        this.panel.remove();
    }
});