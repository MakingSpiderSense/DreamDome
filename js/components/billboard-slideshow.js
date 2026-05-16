/**
 * Billboard Slideshow
 *
 * Cycles through billboard slides on a timed loop and can flash static transition frames before showing the next slide for a retro TV noise effect.
 */
const billboardSlideshow = {
    schema: {
        slides: { type: "array", default: [] }, // Slide IDs from <a-assets>
        staticFrames: { type: "array", default: [] }, // Static frame IDs from <a-assets>
        slideDuration: { type: "number", default: 5000 }, // Duration each slide is shown in milliseconds
        staticLoops: { type: "number", default: 3 }, // Number of times to loop through all static frames during transition
        staticFrameDuration: { type: "number", default: 60 } // Duration each static frame is shown in milliseconds
    },
    init: function () {
        this.currentSlideIndex = 0;
        this.isTransitioning = false;
        this.timeoutId = null; // Used to keep track of setTimeout ID for clearing if component is removed
        if (!this.data.slides.length) {
            console.warn("billboard-slideshow: Need at least one slide.");
            return;
        }
        this.el.setAttribute("src", this.data.slides[this.currentSlideIndex]); // Set source to first slide
        this.scheduleNextSlideTransition();
    },
    remove: function () {
        // Clear timeout so that the slide doesn't continue to change after the component is removed
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    },
    /**
     * Schedule next slide transition
     *
     * Schedules the next slideshow transition by storing a timeout that calls playStaticTransition after slideDuration milliseconds.
     */
    scheduleNextSlideTransition: function () {
        this.timeoutId = setTimeout(() => {
            this.playStaticTransition();
        }, this.data.slideDuration);
    },
    /**
     * Play static transition
     *
     * Plays a static-frame transition sequence before advancing to the next slide.
     */
    playStaticTransition: function () {
        // If the isTransitioning is already true, that means we've already...
        if (this.isTransitioning || !this.data.staticFrames.length) {
            this.showNextSlide();
            return;
        }
        this.isTransitioning = true;
        const totalStaticFrames = this.data.staticFrames.length * this.data.staticLoops;
        let staticFrameIndex = 0;
        /**
         * Loop through static frames for the transition effect, then show the next slide when done
         */
        const flashNextStaticFrame = () => {
            // Show next slide and exit loop when we've flashed through all static frames
            if (staticFrameIndex >= totalStaticFrames) {
                this.showNextSlide();
                return;
            }
            // Set source to next static frame and schedule the next one
            const frameSrc = this.data.staticFrames[staticFrameIndex % this.data.staticFrames.length];
            this.el.setAttribute("src", frameSrc);
            staticFrameIndex++;
            this.timeoutId = setTimeout(flashNextStaticFrame, this.data.staticFrameDuration); // This is what keeps the loop going
        };
        flashNextStaticFrame();
    },
    /**
     * Show next slide
     *
     * Advances to the next slide in the slideshow, updates the displayed image source, clears the transition state, and schedules the following slide transition.
     */
    showNextSlide: function () {
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.data.slides.length; // Increment by 1, but loop back to 0 if at end
        this.el.setAttribute("src", this.data.slides[this.currentSlideIndex]); // Update source to next slide
        this.isTransitioning = false;
        this.scheduleNextSlideTransition();
    }
};
AFRAME.registerComponent("billboard-slideshow", billboardSlideshow);