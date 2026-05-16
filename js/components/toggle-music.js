/**
 * Toggle Music
 */
const toggleMusic = {
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
};
AFRAME.registerComponent('toggle-music', toggleMusic);