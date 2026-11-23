/**
 * Music Layer Manager
 *
 * Manages transitions between synced audio layers.
 */
const musicLayerManager = {
    schema: {
        layers: { type: "array", default: [] }, // IDs of audio layers
        fadeDuration: { type: "number", default: 1000 }, // Duration for layer fade transitions
        eventName: { type: "string", default: "" }, // Event to trigger transitions
        eventTarget: { type: "selector" }, // Entity emitting the event (defaults to this.el if null)
        eventThresholds: { type: "string", default: "" }, // Format: "1:0, 7:1, 13:2, 17:3" (num_of_events:layer_index)
        stopEventName: { type: "string", default: "" }, // Event to fade out all
        stopDelay: { type: "number", default: 0 }, // Delay before fading out
        finalLayer: { type: "selector" }, // Specific layer for victory/completion
        finalEventName: { type: "string", default: "" }, // Event to trigger final layer
        finalFadeDuration: { type: "number", default: 1000 } // Duration for the victory fade
    },

    /**
     * Initialize component
     *
     * Sets up the audio entities for each layer and binds event handlers.
     */
    init() {
        this.currentLayerIndex = -1;
        this.isStarted = false; // Tracks if the music has started playing
        this.soundEntities = []; // We will store all the audio entities corresponding to each layer here
        this.fading = false;
        this.fadeProgress = 0;
        this.fadeFromIndex = -1;
        this.fadeToIndex = -1;
        this.isFadingOutAll = false; // Tracks if all layers are fading out (at end)
        this.isTransitioningToFinal = false;
        this.thresholdMap = {}; // To create the mapping from the eventThresholds

        // Parse thresholds
        if (this.data.eventThresholds) {
            this.data.eventThresholds.split(",").forEach(pair => {
                // Split each pair into count/value and layer index
                const [value, index] = pair.trim().split(":");
                // Create mapping
                this.thresholdMap[value] = parseInt(index);
            });
        }

        // Create audio entities for each layer to ensure they can be played back in parallel.
        this.data.layers.forEach((selector) => {
            const entity = document.createElement("a-entity");
            entity.setAttribute("sound", {
                src: selector,
                loop: true,
                autoplay: false,
                volume: 0,
                positional: false
            });
            this.el.appendChild(entity);
            this.soundEntities.push(entity);
        });

        // Setup final layer if provided
        if (this.data.finalLayer) {
            // Ensure audio is ready and volume is 0
            this.data.finalLayer.setAttribute("sound", "volume", 0);
            this.data.finalLayer.setAttribute("sound", "autoplay", false);
        }

        // Bind methods
        this.transitionToLayer = this.transitionToLayer.bind(this);
        this.fadeOutAll = this.fadeOutAll.bind(this);
        this.onTriggerEvent = this.onTriggerEvent.bind(this);
        this.onStopTriggerEvent = this.onStopTriggerEvent.bind(this);
        this.onFinalTriggerEvent = this.onFinalTriggerEvent.bind(this);

        // Listen for events
        const target = this.data.eventTarget || this.el;
        if (this.data.eventName) {
            target.addEventListener(this.data.eventName, this.onTriggerEvent);
        }
        if (this.data.stopEventName) {
            target.addEventListener(this.data.stopEventName, this.onStopTriggerEvent);
        }
        if (this.data.finalEventName) {
            target.addEventListener(this.data.finalEventName, this.onFinalTriggerEvent);
        }
    },

    /**
     * On Trigger Event
     *
     * Handles events by checking if the detail count matches a threshold.
     *
     * @param {CustomEvent} event The trigger event.
     */
    onTriggerEvent(event) {
        // Get current count of triggers (e.g. orbs collected) or fallback to a value provided
        const val = event.detail.count !== undefined ? event.detail.count : event.detail.value;
        // If count/value is found in the map, transition to the corresponding layer
        if (this.thresholdMap[val] !== undefined) {
            this.transitionToLayer(this.thresholdMap[val]);
        }
    },

    /**
     * On Stop Trigger Event
     *
     * Fades out music when the stop event is received.
     */
    onStopTriggerEvent() {
        if (this.data.stopDelay > 0) {
            window.setTimeout(this.fadeOutAll, this.data.stopDelay);
        } else {
            this.fadeOutAll();
        }
    },

    /**
     * On Final Trigger Event
     *
     * Triggers transition to final layer.
     */
    onFinalTriggerEvent() {
        this.transitionToFinalLayer();
    },

    /**
     * Tick
     *
     * Handles volume interpolation during fades.
     *
     * @param {number} time Total time in milliseconds.
     * @param {number} delta Time since last frame in milliseconds.
     */
    tick(time, delta) {
        // Precondition check: Only proceed if a fade in progress
        if (!this.fading) {
            return;
        }
        // Set duration based on the type of transition (final layer or regular fade)
        const duration = (this.isTransitioningToFinal && !this.isFadingOutAll) ? this.data.finalFadeDuration : this.data.fadeDuration;
        // Calculate fade progress to set volume later (0 to 1 decimal percentage)
        this.fadeProgress += delta / duration;
        const progress = Math.min(this.fadeProgress, 1);

        // Handle fading out all layers.
        if (this.isFadingOutAll) {
            // Collect all sound entities
            const allEntities = [...this.soundEntities];
            if (this.data.finalLayer) allEntities.push(this.data.finalLayer);
            // Lower volume of all entities a little with each tick based on fade duration
            allEntities.forEach((entity) => {
                const currentVolume = entity.components.sound.data.volume;
                if (currentVolume > 0) {
                    entity.setAttribute("sound", "volume", Math.max(0, currentVolume - (delta / this.data.fadeDuration)));
                }
            });
            // End fade out if progress is complete
            if (progress >= 1) {
                this.stopAll();
            }
            return;
        }

        if (this.isTransitioningToFinal) {
            const fromEntity = this.soundEntities[this.fadeFromIndex];
            const toEntity = this.data.finalLayer;

            if (fromEntity) {
                fromEntity.setAttribute("sound", "volume", 1 - progress);
            }
            if (toEntity) {
                toEntity.setAttribute("sound", "volume", progress);
            }

            if (progress >= 1) {
                this.completeFade();
            }
            return;
        }

        const fromEntity = this.soundEntities[this.fadeFromIndex];
        const toEntity = this.soundEntities[this.fadeToIndex];

        // Fade out previous layer.
        if (fromEntity) {
            fromEntity.setAttribute("sound", "volume", 1 - progress);
        }

        // Fade in new layer.
        if (toEntity) {
            toEntity.setAttribute("sound", "volume", progress);
        }

        if (progress >= 1) {
            this.completeFade();
        }
    },

    /**
     * Transition To Layer
     *
     * Transitions from the current layer to a specific layer index.
     *
     * @param {number} index The index of the layer to transition to.
     */
    transitionToLayer(index) {
        // Precondition check
        if (index < 0 || index >= this.soundEntities.length) {
            return;
        }
        // If music hasn't started yet, start it with the specified layer.
        if (!this.isStarted) {
            this.startMusic(index);
            return;
        }
        // If the requested layer is already the current layer, no transition is needed.
        if (this.currentLayerIndex === index) {
            return;
        }
        // Guard: If fade is already in progress (rare)
        if (this.fading) {
            this.completeFade();
        }
        // Update state
        this.fadeFromIndex = this.currentLayerIndex;
        this.fadeToIndex = index;
        this.currentLayerIndex = index;
        this.fadeProgress = 0;
        this.fading = true;
        this.isFadingOutAll = false;
        this.isTransitioningToFinal = false;
    },

    /**
     * Transition To Final Layer
     *
     * Transitions to the designated final layer.
     */
    transitionToFinalLayer() {
        // Precondition check
        if (!this.data.finalLayer || !this.isStarted) {
            return;
        }
        // Guard: If fade is already in progress (rare)
        if (this.fading) {
            this.completeFade();
        }
        // Update state
        this.fadeFromIndex = this.currentLayerIndex;
        this.isTransitioningToFinal = true;
        this.fadeProgress = 0;
        this.fading = true;
        this.isFadingOutAll = false;
        // Start final layer sound
        if (this.data.finalLayer.components.sound) {
            this.data.finalLayer.components.sound.playSound();
        }
    },

    /**
     * Start Music
     *
     * Starts all layers simultaneously with only the specified layer audible. We play them all at once to keep all layers in sync.
     *
     * @param {number} startIndex The index of the layer to start with.
     */
    startMusic(startIndex) {
        // Play all layers simultaneously, but only specified layer will be audible
        this.soundEntities.forEach((entity, index) => {
            entity.components.sound.playSound();
            entity.setAttribute("sound", "volume", index === startIndex ? 1 : 0);
        });
        if (this.data.finalLayer) {
            this.data.finalLayer.setAttribute("sound", "volume", 0);
        }
        // Update state
        this.currentLayerIndex = startIndex;
        this.isStarted = true;
        this.isFadingOutAll = false;
        this.isTransitioningToFinal = false;
    },

    /**
     * Fade Out All
     *
     * Fades out all playing layers.
     */
    fadeOutAll() {
        // Precondition check
        if (!this.isStarted) {
            return;
        }
        // Update state
        this.fadeProgress = 0;
        this.fading = true;
        this.isFadingOutAll = true;
    },

    /**
     * Stop All
     *
     * Stops all layers and resets state.
     */
    stopAll() {
        // Stop all entities and reset their volumes
        this.soundEntities.forEach((entity) => {
            entity.components.sound.stopSound();
            entity.setAttribute("sound", "volume", 0);
        });
        if (this.data.finalLayer) {
            this.data.finalLayer.components.sound.stopSound();
            this.data.finalLayer.setAttribute("sound", "volume", 0);
        }
        // Update state
        this.fading = false;
        this.isStarted = false;
        this.currentLayerIndex = -1;
    },

    /**
     * Complete Fade
     *
     * Sets "fading" flag to false and updates layer volumes appropriately.
     */
    completeFade() {
        this.fading = false;
        // targetIndex determines which layer should be audible after the fade completes
        const targetIndex = this.isTransitioningToFinal ? -1 : this.currentLayerIndex;
        // Fade out all layers but the target layer (most will likely already be at volume 0)
        this.soundEntities.forEach((entity, index) => {
            entity.setAttribute("sound", "volume", index === targetIndex ? 1 : 0);
        });
        // If transitioning to the final layer, make it audible
        if (this.isTransitioningToFinal && this.data.finalLayer) {
            this.data.finalLayer.setAttribute("sound", "volume", 1);
            this.currentLayerIndex = -1; // Reset to no numeric layer
        }
        // Update flag
        this.isTransitioningToFinal = false;
    }
};

AFRAME.registerComponent("music-layer-manager", musicLayerManager);
