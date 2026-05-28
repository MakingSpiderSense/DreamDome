/**
 * Orb Collection Minigame
 *
 * Description: Spawns collectible glowing orbs above a nav mesh, spaces them apart, removes them when the player gets close, and plays optional sounds for orb collection and full completion.
 *
 * Example: <a-scene orb-collection-minigame="navMeshEl: #my-nav-mesh; collectSound: #orb-collect; allCollectedSound: #orb-win"></a-scene>
 *
 * Use the IDs of the entities for the nav mesh and sounds (not the asset IDs).
 */
const orbCollectionMinigame = {
    schema: {
        navMeshEl: { type: 'selector', default: '[nav-mesh]' },
        orbRadius: { type: 'number', default: 0.5 },
        count: { type: 'int', default: 20  },
        height: { type: 'number', default: 1.5 },
        minDistance: { type: 'number', default: 6 },
        collectRadius: { type: 'number', default: 1.8 },
        showSpeed: { type: 'boolean', default: false },
        collectSound: { type: 'string', default: '' },
        allCollectedSound: { type: 'string', default: '' },
    },

    init: function () {
        this.orbs = []; // Array to hold references to the spawned orbs
        this.collected = 0; // Counter for collected orbs
        this.cameraWorldPosition = new THREE.Vector3(); // To store camera world position for distance calculations
        this.previousCameraWorldPosition = new THREE.Vector3(); // Used to calculate player travel speed for the optional HUD readout
        this.hasPreviousCameraWorldPosition = false;
        this.tickFrameCounter = 0; // Counter to track frames for throttling distance checks
        this.hasCollectedAllOrbs = false;
        this.gameStartTime = null; // Set to Date.now() when the first orb is collected
        this.hudEl = null; // HUD container entity (parented to camera)
        this.hudOrbCountTextEl = null; // Text element showing orbs collected count
        this.hudTimerTextEl = null; // Text element showing elapsed time
        this.hudSpeedTextEl = null; // Optional text element showing current travel speed
        this.leaderboardEl = null; // Leaderboard container entity (parented to camera)
        this.nameInputEl = null; // Active name input entity while the player enters their score name
        this.boostDuration = 5000; // Duration of movement speed boost in ms after collecting an orb
        this.currentBoostLevel = 0; // Boost levels of 0 (no boost), 1 (small boost), 2 (large boost), 3 (max boost)
        this.boostTimeoutId = null; // To remove unused boost timeout when collecting another orb before current boost expires
        this.movementSpeedModifierEl = null; // Used for speed boosts
        this.movementSpeedModifierComponent = null; // Used for speed boosts
        this.standardLeaderboardStorageKey = 'orb-minigame-scores'; // Local storage key for standard run
        this.powerLeaderboardStorageKey = 'orb-minigame-power-run-scores'; // Local storage key for power run (only arm swing locomotion used)
        this.leftControllerSelector = '[meta-touch-controls*="hand: left"], [meta-touch-controls*="hand:left"], [oculus-touch-controls*="hand: left"], [oculus-touch-controls*="hand:left"], [hand-controls*="hand: left"], [hand-controls*="hand:left"]';
        this.leftControllerEl = null; // Used to detect joystick movement for leaderboard categorization
        this.originalMovementSpeedModifierSettings = null; // Store original settings to restore later
        this.usedRegularMovementControls = false; // True once any keyboard key or left joystick movement is used during the run

        // Set up listeners and bindings
        this.blockShiftDuringMinigame = this.blockShiftDuringMinigame.bind(this);
        this.trackKeyboardUsage = this.trackKeyboardUsage.bind(this);
        this.trackLeftJoystickUsage = this.trackLeftJoystickUsage.bind(this);
        window.addEventListener('keydown', this.blockShiftDuringMinigame, true);
        window.addEventListener('keyup', this.blockShiftDuringMinigame, true);
        window.addEventListener('keydown', this.trackKeyboardUsage);

        // Hidden reset: add ?reset-scores to the URL to wipe the leaderboard
        if (new URLSearchParams(window.location.search).has('reset-scores')) {
            localStorage.removeItem(this.standardLeaderboardStorageKey);
            localStorage.removeItem(this.powerLeaderboardStorageKey);
        }

        // Set up check for joystick movement on left controller (determines leaderboard category)
        this.leftControllerEl = this.el.sceneEl.querySelector(this.leftControllerSelector);
        if (this.leftControllerEl) {
            this.leftControllerEl.addEventListener('axismove', this.trackLeftJoystickUsage);
        }

        // Create the HUD attached to camera. Defer if camera isn't ready yet.
        if (this.el.sceneEl.camera) {
            this.createHud();
        } else {
            this.el.sceneEl.addEventListener('camera-set-active', () => this.createHud(), { once: true });
        }

        // Make sure nav mesh is loaded before spawning orbs
        const navMeshEl = this.data.navMeshEl;
        if (!navMeshEl) { console.warn('orb-collection-minigame: navMeshEl not found'); return; }
        // Spawn orbs once nav mesh is ready.
        if (navMeshEl.getObject3D('mesh')) {
            this.spawnOrbs();
        } else {
            navMeshEl.addEventListener('model-loaded', () => this.spawnOrbs(), { once: true });
        }
    },

    /**
     * Spawn floating orbs
     *
     * Finds valid positions on the nav mesh, keeps each orb a minimum distance apart, creates animated orb entities, and adds them to the scene for collection gameplay.
     *
     * @returns {void} Does not return a value.
     */
    spawnOrbs: function () {
        const navMeshEl = this.data.navMeshEl;
        const navMeshObject3D = navMeshEl.getObject3D('mesh');
        if (!navMeshObject3D) { console.warn('orb-collection-minigame: nav mesh Object3D not ready'); return; }
        const navMeshBounds = new THREE.Box3().setFromObject(navMeshObject3D);
        const surfaceRaycaster = new THREE.Raycaster();
        const downwardRayDirection = new THREE.Vector3(0, -1, 0);
        const rayOrigin = new THREE.Vector3();
        const targetOrbCount = this.data.count;
        const orbHeightOffset = this.data.height;
        const minSpacingSquared = this.data.minDistance * this.data.minDistance;
        const placedOrbPositions = [];
        let spawnAttempts = 0;

        // Attempt to place all orbs
        while (placedOrbPositions.length < targetOrbCount && spawnAttempts < targetOrbCount * 150) {
            spawnAttempts++; // Keep track to prevent infinite loop if nav mesh is too small or minDistance too large

            const randomX = THREE.MathUtils.lerp(navMeshBounds.min.x, navMeshBounds.max.x, Math.random());
            const randomZ = THREE.MathUtils.lerp(navMeshBounds.min.z, navMeshBounds.max.z, Math.random());
            // Cast a ray downward from above the nav mesh to find the surface height at the random (x, z) position
            rayOrigin.set(randomX, navMeshBounds.max.y + 5, randomZ);
            surfaceRaycaster.set(rayOrigin, downwardRayDirection);
            // Check if the ray intersects with the nav mesh
            const rayHits = surfaceRaycaster.intersectObject(navMeshObject3D, true);
            if (!rayHits.length) continue;
            // Candidate orb position is `orbHeightOffset` meters above the nav mesh surface at the ray hit point
            const candidateOrbPosition = new THREE.Vector3(
                rayHits[0].point.x,
                rayHits[0].point.y + orbHeightOffset,
                rayHits[0].point.z
            );
            // Check if candidate position is too close to any already placed orb. If so discard attempt and try again
            let isTooCloseToExistingOrb = false;
            for (const placedOrbPosition of placedOrbPositions) {
                const deltaX = candidateOrbPosition.x - placedOrbPosition.x;
                const deltaZ = candidateOrbPosition.z - placedOrbPosition.z;
                if (deltaX * deltaX + deltaZ * deltaZ < minSpacingSquared) {
                    isTooCloseToExistingOrb = true;
                    break;
                }
            }
            if (isTooCloseToExistingOrb) continue;
            // Candidate position is valid, add to list of placed orbs
            placedOrbPositions.push(candidateOrbPosition);
        }

        // Send warning if we weren't able to place the target number of orbs
        if (placedOrbPositions.length < targetOrbCount) {
            console.warn(`orb-collection-minigame: placed ${placedOrbPositions.length}/${targetOrbCount} orbs — nav mesh may be too small or minDistance too large`);
        }

        // Create and place orbs at the valid positions we found
        const orbColors = ['#96fffe', '#3DFFA0', '#FFE45E', '#d7ffe7'];
        placedOrbPositions.forEach(orbPosition => {
            const orb = document.createElement('a-sphere');
            const randomAnimationDelay = Math.floor(Math.random() * 4001);
            const randomStartingColorIndex = Math.floor(Math.random() * orbColors.length);
            const startingColor = orbColors[randomStartingColorIndex];
            const bobStartY = (orbPosition.y - 0.05).toFixed(3);
            const bobEndY = (orbPosition.y + 0.05).toFixed(3);
            orb.setAttribute('radius', this.data.orbRadius);
            orb.setAttribute('position', `${orbPosition.x} ${orbPosition.y} ${orbPosition.z}`);
            orb.setAttribute('material', `color: ${startingColor}; emissive: #1A1A2E; emissiveIntensity: 0.5; opacity: 0.75; transparent: true; shader: standard; depthWrite: false;`);

            // Vertical bob: each orb floats 10 cm total on the Y axis with a randomized startup offset
            orb.setAttribute('animation__float', `property: position; from: ${orbPosition.x} ${bobStartY} ${orbPosition.z}; to: ${orbPosition.x} ${bobEndY} ${orbPosition.z}; dir: alternate; dur: 2200; easing: easeInOutSine; loop: true; delay: ${randomAnimationDelay}`);

            // Pulsing scale: each orb randomly varies between 0.9 and 1.1 scale, with the same randomized startup offset
            const randomFromScaleX = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomFromScaleY = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomFromScaleZ = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomToScaleX = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomToScaleY = (Math.random() * 0.2 + 0.9).toFixed(2);
            const randomToScaleZ = (Math.random() * 0.2 + 0.9).toFixed(2);
            orb.setAttribute('animation__pulse', `property: scale; from: ${randomFromScaleX} ${randomFromScaleY} ${randomFromScaleZ}; to: ${randomToScaleX} ${randomToScaleY} ${randomToScaleZ}; dir: alternate; dur: 1800; easing: easeInOutSine; loop: true; delay: ${randomAnimationDelay}`);

            // Color cycle keeps the same order for every orb, but each orb can begin at a different color in that sequence.
            for (let colorStepIndex = 0; colorStepIndex < orbColors.length; colorStepIndex++) {
                const currentColorIndex = (randomStartingColorIndex + colorStepIndex) % orbColors.length;
                const nextColorIndex = (currentColorIndex + 1) % orbColors.length;
                const animationName = `animation__color${colorStepIndex + 1}`;
                const previousAnimationName = colorStepIndex === 0
                    ? `start-color-cycle, animationcomplete__color${orbColors.length}`
                    : `animationcomplete__color${colorStepIndex}`;

                orb.setAttribute(animationName, `property: material.color; from: ${orbColors[currentColorIndex]}; to: ${orbColors[nextColorIndex]}; dur: 1600; easing: easeInOutSine; startEvents: ${previousAnimationName}`);
            }

            // Kick off the color cycle once the entity is ready
            orb.addEventListener('loaded', () => {
                window.setTimeout(() => {
                    if (!orb.parentNode) return;
                    orb.emit('start-color-cycle');
                }, randomAnimationDelay);
            }, { once: true });

            this.el.sceneEl.appendChild(orb);
            this.orbs.push({ el: orb, pos: orbPosition.clone(), collected: false }); // Store orb element, position, and collected state
        });
    },

    /**
     * Create HUD
     *
     * Builds and attaches a simple HUD to the camera so the player can see orb progress on the left and elapsed time on the right during the minigame.
     *
     * @returns {void} Does not return a value.
     */
    createHud: function () {
        const cameraEl = this.el.sceneEl.camera.el;
        const isSpeedHudEnabled = this.data.showSpeed; // Only show speed readout if enabled

        // Parent container to camera and position it just below center view
        const hudContainerEl = document.createElement('a-entity');
        hudContainerEl.setAttribute('position', isSpeedHudEnabled ? '0 -0.17 -0.6' : '0 -0.15 -0.6');

        // Transparent background panel
        const hudPanelEl = document.createElement('a-entity');
        hudPanelEl.setAttribute('width', isSpeedHudEnabled ? '0.42' : '0.3');
        hudPanelEl.setAttribute('height', isSpeedHudEnabled ? '0.11' : '0.07');
        hudContainerEl.appendChild(hudPanelEl);

        // Orb count on the left side
        this.hudOrbCountTextEl = document.createElement('a-text');
        this.hudOrbCountTextEl.setAttribute('value', `0 / ${this.data.count} orbs`);
        this.hudOrbCountTextEl.setAttribute('position', '-0.130 0 0.001');
        this.hudOrbCountTextEl.setAttribute('color', '#FFFFFF');
        this.hudOrbCountTextEl.setAttribute('width', '0.48');
        this.hudOrbCountTextEl.setAttribute('align', 'left');
        this.hudOrbCountTextEl.setAttribute('anchor', 'left'); // starts at x position and extends rightward
        this.hudOrbCountTextEl.setAttribute('baseline', 'center');
        hudContainerEl.appendChild(this.hudOrbCountTextEl);

        // Timer on the right side
        this.hudTimerTextEl = document.createElement('a-text');
        this.hudTimerTextEl.setAttribute('value', '00:00');
        this.hudTimerTextEl.setAttribute('position', '0.130 0 0.001');
        this.hudTimerTextEl.setAttribute('color', '#FFFFFF');
        this.hudTimerTextEl.setAttribute('width', '0.48');
        this.hudTimerTextEl.setAttribute('align', 'right');
        this.hudTimerTextEl.setAttribute('anchor', 'right'); // ends at x position and extends leftward
        this.hudTimerTextEl.setAttribute('baseline', 'center');
        hudContainerEl.appendChild(this.hudTimerTextEl);

        // Show player speed if enabled
        if (isSpeedHudEnabled) {
            this.hudSpeedTextEl = document.createElement('a-text');
            this.hudSpeedTextEl.setAttribute('value', '0.00 m/s');
            this.hudSpeedTextEl.setAttribute('position', '0 -0.035 0.001');
            this.hudSpeedTextEl.setAttribute('color', '#8DEBFF');
            this.hudSpeedTextEl.setAttribute('width', '0.5');
            this.hudSpeedTextEl.setAttribute('align', 'center');
            this.hudSpeedTextEl.setAttribute('baseline', 'center');
            hudContainerEl.appendChild(this.hudSpeedTextEl);
        }

        hudContainerEl.setAttribute('visible', false);
        cameraEl.appendChild(hudContainerEl);
        this.hudEl = hudContainerEl;
    },

    /**
     * Format time in milliseconds to MM:SS
     *
     * @param {number} totalMilliseconds - The total elapsed time in milliseconds.
     * @returns {string} The formatted time string (MM:SS).
     */
    formatTime: function (totalMilliseconds) {
        const totalSeconds = Math.floor(totalMilliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * Check if the scene is in desktop mode
     *
     * @returns {boolean} True when the scene is not currently in VR mode.
     */
    isDesktopMode: function () {
        return !this.el.sceneEl.is('vr-mode');
    },

    /**
     * Sanitize a leaderboard name
     *
     * Keeps only letters and limits the saved name to 12 characters.
     *
     * @param {string} name - Raw name text from the input UI.
     * @returns {string} Cleaned player name.
     */
    sanitizeLeaderboardName: function (name) {
        return String(name || '')
            .replace(/[^A-Za-z]/g, '') // Remove non-letter characters
            .slice(0, 12); // Limit to 12 characters
    },

    /**
     * Get saved local leaderboard scores
     *
     * @returns {Array<object>} Saved scores from localStorage for the active leaderboard mode.
     */
    getSavedLocalScores: function () {
        const storageKey = this.usedRegularMovementControls
            ? this.standardLeaderboardStorageKey
            : this.powerLeaderboardStorageKey;
        let savedScores = [];
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) savedScores = JSON.parse(stored);
        } catch (e) {
            savedScores = [];
        }
        return Array.isArray(savedScores) ? savedScores : [];
    },

    /**
     * Release movement keys
     *
     * Sends keyup events for common movement keys so desktop movement does not continue while the name prompt is open.
     *
     * @returns {void} Does not return a value.
     */
    releaseMovementKeys: function () {
        const movementKeys = [
            { code: 'KeyW', key: 'w' },
            { code: 'KeyA', key: 'a' },
            { code: 'KeyS', key: 's' },
            { code: 'KeyD', key: 'd' },
            { code: 'ArrowUp', key: 'ArrowUp' },
            { code: 'ArrowLeft', key: 'ArrowLeft' },
            { code: 'ArrowDown', key: 'ArrowDown' },
            { code: 'ArrowRight', key: 'ArrowRight' },
        ];

        movementKeys.forEach((movementKey) => {
            window.dispatchEvent(new KeyboardEvent('keyup', {
                code: movementKey.code,
                key: movementKey.key,
                bubbles: true,
            }));
        });
    },

    /**
     * Track if keyboard is used
     *
     * Marks that regular movement controls were used when a movement key is pressed during an active game, and ignores input before the game starts or after all orbs are collected.
     *
     * @returns {void} This function does not return a value.
     */
    trackKeyboardUsage: function () {
        if (this.gameStartTime === null || this.hasCollectedAllOrbs) return;
        this.usedRegularMovementControls = true;
    },

    /**
     * Track if left joystick is used
     *
     * Checks if the player is moving a joystick enough to count as using regular movement controls, and if so, marks that the player has used them.
     *
     * @param {Event} event - The axis move event, which contains axis values representing how far each stick is pushed.
     * @returns {void} This function does not return a value.
     */
    trackLeftJoystickUsage: function (event) {
        if (this.gameStartTime === null || this.hasCollectedAllOrbs) return;
        const axis = event.detail && event.detail.axis ? event.detail.axis : [];
        // Check to see if horizontal or vertical axis values exceed a small deadzone threshold
        const horizontal = axis[2] || 0;
        const vertical = axis[3] || 0;
        if (Math.abs(horizontal) < 0.1 && Math.abs(vertical) < 0.1) return;
        this.usedRegularMovementControls = true; // Movement detected
    },

    /**
     * Update speed HUD
     *
     * Calculates how fast the camera moved since the last frame and updates the HUD text to show the current speed in meters per second.
     *
     * @param {number} timeDelta - The elapsed time since the previous frame in milliseconds.
     * @returns {void} This function does not return a value.
     */
    updateSpeedHud: function (timeDelta) {
        if (!this.hudSpeedTextEl) return;
        let speedMetersPerSecond = 0;
        if (this.hasPreviousCameraWorldPosition && timeDelta > 0) {
            const distanceMeters = this.cameraWorldPosition.distanceTo(this.previousCameraWorldPosition);
            speedMetersPerSecond = (distanceMeters / timeDelta) * 1000;
        }
        this.hudSpeedTextEl.setAttribute('value', `${speedMetersPerSecond.toFixed(2)} m/s`);
        this.previousCameraWorldPosition.copy(this.cameraWorldPosition);
        this.hasPreviousCameraWorldPosition = true;
    },

    /**
     * Save score to leaderboard
     *
     * @param {number} playerTimeMs - The player's completion time in ms to save to the leaderboard.
     * @param {string} playerName - The player's name to save to the leaderboard.
     * @returns {Object} An object containing the updated list of top scores, the player's rank index, and the sanitized player name that was saved: scores, playerRankIndex, playerName.
     */
    saveScoreToLeaderboard: function (playerTimeMs, playerName) {
        const storageKey = this.usedRegularMovementControls
            ? this.standardLeaderboardStorageKey
            : this.powerLeaderboardStorageKey;
        let savedScores = this.getSavedLocalScores();
        const sanitizedPlayerName = this.sanitizeLeaderboardName(playerName);
        const newScore = {
            timeMs: playerTimeMs,
            name: sanitizedPlayerName,
            savedAt: Date.now(),
        };
        // Add the new score, sort the list, and keep only the top 10 scores
        savedScores.push(newScore);
        savedScores.sort((a, b) => a.timeMs - b.timeMs);
        if (savedScores.length > 10) savedScores = savedScores.slice(0, 10);
        const playerRankIndex = savedScores.indexOf(newScore);
        // Attempt to save the updated scores back to localStorage
        try {
            localStorage.setItem(storageKey, JSON.stringify(savedScores));
        } catch (e) {
            console.warn('orb-collection-minigame: Could not save score to localStorage');
        }
        return {
            scores: savedScores,
            playerRankIndex,
            playerName: sanitizedPlayerName,
        };
    },

    /**
     * Get leaderboard player names
     *
     * Creates a list of player names for the current leaderboard render.
     *
     * @param {Array<object>} scores - Saved score entries pulled from localStorage.
     * @param {number} totalRows - Total number of leaderboard rows to render.
     * @returns {Array<string>} The display names aligned with the score rows.
     */
    getLeaderboardPlayerNames: function (scores, totalRows) {
        const availableNames = ['Art3mis', 'Parzival', 'Shoto'];
        const playerNames = [];
        for (let scoreIndex = 0; scoreIndex < totalRows; scoreIndex++) {
            // Use stored name if found
            const storedName = this.sanitizeLeaderboardName(scores[scoreIndex]?.name);
            if (storedName) {
                playerNames.push(storedName);
                continue;
            }
            // Otherwise, randomly pick from default available names
            const randomNameIndex = Math.floor(Math.random() * availableNames.length);
            playerNames.push(availableNames[randomNameIndex]);
        }
        return playerNames;
    },

    /**
     * Prompt for leaderboard name
     *
    * Shows the desktop modal or VR keyboard for top-10 runs, then saves the completed run with the entered name, then renders the leaderboard.
     *
     * @param {number} playerTimeMs - The player's completion time in milliseconds.
     * @returns {void} Does not return a value.
     */
    promptForLeaderboardName: function (playerTimeMs) {
        // Remove existing name input if player is replaying to get a better time (although not possible yet as of 2026-05-28)
        if (this.nameInputEl && this.nameInputEl.parentNode) {
            this.nameInputEl.parentNode.removeChild(this.nameInputEl);
        }

        // Release movement keys so player doesn't keep moving while entering their name on desktop
        this.releaseMovementKeys();

        const savedScores = this.getSavedLocalScores();
        const previewScore = { timeMs: playerTimeMs }; // Player's current score
        const previewScores = savedScores.concat(previewScore); // Add it to the list of existing scores
        previewScores.sort((a, b) => a.timeMs - b.timeMs); // Sort - fastest times first
        const previewRankIndex = previewScores.indexOf(previewScore); // Check their rank

        // If they don't make the top 10, show the leaderboard without their score and skip the name entry step since their score won't be saved
        if (previewRankIndex < 0 || previewRankIndex >= 10) {
            this.showLeaderboard(playerTimeMs, { scores: savedScores, playerRankIndex: -1 });
            return;
        }

        if (this.isDesktopMode()) {
            const modalEl = document.createElement('a-entity');

            // Set up event listeners for submit and cancel events
            const handleDesktopSubmit = (event) => {
                const saveResultObj = this.saveScoreToLeaderboard(playerTimeMs, event.detail?.value);
                this.showLeaderboard(playerTimeMs, saveResultObj);
            };
            const handleDesktopCancel = () => {
                this.showLeaderboard(playerTimeMs, { scores: savedScores, playerRankIndex: -1 });
            };

            // Display modal and add event listeners
            modalEl.setAttribute('desktop-modal-input', 'label: Enter Name; helpText: Letters only, max 12 characters; maxLength: 12');
            modalEl.addEventListener('desktop-modal-input-submit', handleDesktopSubmit, { once: true });
            modalEl.addEventListener('desktop-modal-input-cancel', handleDesktopCancel, { once: true });
            this.el.sceneEl.appendChild(modalEl);
            this.nameInputEl = modalEl;
            return;
        }

        // Get rid of HUD
        if (this.hudEl) this.hudEl.setAttribute('visible', false);

        const keyboardAnchorEl = document.querySelector('#cameraRig') || this.el.sceneEl.camera?.el || null;
        if (!keyboardAnchorEl) {
            const saveResultObj = this.saveScoreToLeaderboard(playerTimeMs, '');
            this.showLeaderboard(playerTimeMs, saveResultObj);
            return;
        }

        const keyboardEl = document.createElement('a-entity');
        keyboardEl.setAttribute('position', `0 0 -1.15`);
        keyboardEl.setAttribute('scale', '0.5 0.5 0.5');
        keyboardEl.setAttribute('vr-keyboard', 'label: Enter Name:; maxLength: 12');
        keyboardEl.addEventListener('keyboard-submit', (event) => {
            const saveResultObj = this.saveScoreToLeaderboard(playerTimeMs, event.detail?.value);
            this.showLeaderboard(playerTimeMs, saveResultObj);
        }, { once: true });
        keyboardAnchorEl.appendChild(keyboardEl);
        this.nameInputEl = keyboardEl; // Set this so we can remove it later if needed
    },

    /**
     * Format leaderboard row
     *
     * Builds a monospace row string with fixed-width columns for duration, player name, and date.
     *
     * @param {number} rankIndex - Zero-based ranking index.
     * @param {object|null} score - Saved score entry or null for an empty row.
     * @param {string} playerName - Display name for the row.
     * @param {number} playerNameCharacters - Fixed character width for the player column.
     * @returns {string} Formatted row text.
     */
    formatLeaderboardRow: function (rankIndex, score, playerName, playerNameCharacters) {
        // Score
        const durationDisplay = score ? this.formatTime(score.timeMs) : '99:59';
        // Player name (with centering)
        const displayPlayerName = playerName || '';
        const totalPadding = Math.max(playerNameCharacters - displayPlayerName.length, 0);
        const leftPadding = Math.floor(totalPadding / 2);
        const rightPadding = totalPadding - leftPadding;
        const paddedPlayerName = `${' '.repeat(leftPadding)}${displayPlayerName}${' '.repeat(rightPadding)}`;
        // Date
        let dateDisplay = score && score.date ? score.date : '2015-10-21'; // Set date to a fallback initially
        if (score && typeof score.savedAt === 'number') {
            const savedAtDate = new Date(score.savedAt);
            dateDisplay = `${savedAtDate.getFullYear()}-${String(savedAtDate.getMonth() + 1).padStart(2, '0')}-${String(savedAtDate.getDate()).padStart(2, '0')}`; // Format as YYYY-MM-DD
        }
        // Combine into one formatted row string
        return `${String(rankIndex + 1).padStart(2)}.  ${durationDisplay}  ${paddedPlayerName}  ${dateDisplay}`;
    },

    /**
     * Create leaderboard panel
     *
     * Builds one leaderboard panel with its title, run type label, score rows, and footer text.
     *
     * @param {object} options - Panel configuration.
     * @returns {object} The created panel entity and the text elements used for fade out: panelEl, panelBackgroundEl, and textEls.
     */
    createLeaderboardPanel: function (options) {
        const {
            panelTitle,
            subtitle,
            scores,
            playerNames,
            playerRankIndex,
            playerTimeMs,
            footerText,
            footerWidth,
            footerY,
            footerColor,
            isFooterSmall,
        } = options;
        const maxPlayerNameCharacters = 12;
        const panelEl = document.createElement('a-entity');

        // Background panel fades in on load
        const panelBackgroundEl = document.createElement('a-plane');
        panelBackgroundEl.setAttribute('width', '1.12');
        panelBackgroundEl.setAttribute('height', '0.98');
        panelBackgroundEl.setAttribute('material', 'color: #000020; opacity: 0; transparent: true; shader: flat');
        panelBackgroundEl.setAttribute('animation__fadein', 'property: material.opacity; from: 0; to: 0.8; dur: 600; easing: easeOutSine');
        panelEl.appendChild(panelBackgroundEl);

        // Title
        const titleTextEl = document.createElement('a-text');
        titleTextEl.setAttribute('value', panelTitle);
        titleTextEl.setAttribute('position', '0 0.38 0.002');
        titleTextEl.setAttribute('color', '#FFFFFF');
        titleTextEl.setAttribute('align', 'center');
        titleTextEl.setAttribute('width', '1.02');
        titleTextEl.setAttribute('opacity', '0');
        titleTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
        panelEl.appendChild(titleTextEl);

        // Subtitle (e.g. "Standard Run" or "Power Run")
        const subtitleTextEl = document.createElement('a-text');
        subtitleTextEl.setAttribute('value', subtitle);
        subtitleTextEl.setAttribute('position', '0 0.320 0.002');
        subtitleTextEl.setAttribute('color', '#FFFFFF');
        subtitleTextEl.setAttribute('align', 'center');
        subtitleTextEl.setAttribute('width', '0.86');
        subtitleTextEl.setAttribute('opacity', '0');
        subtitleTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
        panelEl.appendChild(subtitleTextEl);

        // Column headings
        const headingTextEl = document.createElement('a-text');
        headingTextEl.setAttribute('value', `DURATION     PLAYER        DATE`);
        headingTextEl.setAttribute('position', '-0.032 0.245 0.002');
        headingTextEl.setAttribute('color', '#FFFFFF');
        headingTextEl.setAttribute('align', 'center');
        headingTextEl.setAttribute('width', '1.03');
        headingTextEl.setAttribute('font', 'sourcecodepro');
        headingTextEl.setAttribute('opacity', '0');
        headingTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
        panelEl.appendChild(headingTextEl);

        const allPanelTextEls = [titleTextEl, subtitleTextEl, headingTextEl];

        // Ten score rows - each shows how long it took to complete, the player name, and date
        for (let rankIndex = 0; rankIndex < 10; rankIndex++) {
            const score = scores[rankIndex] || null;
            const playerName = playerNames[rankIndex] || '';
            const rowText = this.formatLeaderboardRow(rankIndex, score, playerName, maxPlayerNameCharacters);
            const rowYPosition = (0.175 - rankIndex * 0.052).toFixed(3);
            const rowXPosition = rankIndex === 9 ? '-0.013' : '0';
            const isPlayerEntry = rankIndex === playerRankIndex; // Player made the top 10
            // Create the text element
            const rowTextEl = document.createElement('a-text');
            rowTextEl.setAttribute('value', rowText);
            rowTextEl.setAttribute('position', `${rowXPosition} ${rowYPosition} 0.002`);
            rowTextEl.setAttribute('color', isPlayerEntry ? '#5CFDCA' : '#FFFFFF');
            rowTextEl.setAttribute('align', 'center');
            rowTextEl.setAttribute('width', '1.03');
            rowTextEl.setAttribute('font', 'sourcecodepro');
            rowTextEl.setAttribute('opacity', '0');
            rowTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
            panelEl.appendChild(rowTextEl);
            allPanelTextEls.push(rowTextEl);
        }

        // Highlight the player's score with a "YOUR SCORE" label at bottom, or show the all-time guidance message
        const footerTextEl = document.createElement('a-text');
        footerTextEl.setAttribute('value', footerText !== undefined ? footerText : `${this.formatTime(playerTimeMs)}  YOUR SCORE`); // It's undefined for the monthly board, so YOUR SCORE is displayed there instead of default message
        footerTextEl.setAttribute('position', `0 ${footerY || '-0.39'} 0.002`);
        footerTextEl.setAttribute('color', footerColor || '#5CFDCA');
        footerTextEl.setAttribute('align', 'center');
        footerTextEl.setAttribute('width', footerWidth || '0.94');
        footerTextEl.setAttribute('font', 'sourcecodepro');
        footerTextEl.setAttribute('opacity', '0');
        if (isFooterSmall) {
            footerTextEl.setAttribute('wrap-count', '39');
        }
        footerTextEl.setAttribute('animation__fadein', 'property: text.opacity; from: 0; to: 1; dur: 600; easing: easeOutSine');
        panelEl.appendChild(footerTextEl);
        allPanelTextEls.push(footerTextEl);

        return {
            panelEl,
            panelBackgroundEl,
            textEls: allPanelTextEls,
        };
    },

    /**
     * Block Shift sprint
     *
     * Prevents ShiftLeft key events from reaching the "movement-controls" component while the minigame is active so sprint does not bypass the temporary boost rules.
     */
    blockShiftDuringMinigame: function (event) {
        if (!this.gameStartTime || this.hasCollectedAllOrbs || event.code !== 'ShiftLeft') return;
        // Prevent default behavior and stop event from propagating to movement-controls
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    },

    /**
     * Dispatch a Shift keyup event
     *
     * @returns {void} Does not return a value.
     */
    releaseLeftShift: function () {
        window.dispatchEvent(new KeyboardEvent('keyup', {
            code: 'ShiftLeft',
            key: 'Shift',
            bubbles: true,
        }));
    },

    /**
     * Get speed modifier
     *
     * Finds and caches the movement-speed-modifier component from the scene so other minigame code can quickly reuse it without searching again each time.
     *
     * @returns {object|null} The movement-speed-modifier component when found, or null if the element/component is missing.
     */
    getMovementSpeedModifier: function () {
        // Return component if already cached
        if (this.movementSpeedModifierEl && this.movementSpeedModifierComponent) {
            return this.movementSpeedModifierComponent;
        }
        // Find the movement speed modifier element and component, cache them, and return the component
        const movementSpeedModifierEl = this.el.sceneEl.querySelector('[movement-speed-modifier]');
        if (!movementSpeedModifierEl) return null;
        const movementSpeedModifierComponent = movementSpeedModifierEl.components['movement-speed-modifier'];
        if (!movementSpeedModifierComponent) return null;
        this.movementSpeedModifierEl = movementSpeedModifierEl;
        this.movementSpeedModifierComponent = movementSpeedModifierComponent;
        return movementSpeedModifierComponent;
    },

    /**
     * Configure speed modifier for minigame
     *
     * Grabs the movement speed modifier component and, if we haven't already saved the player's original speed settings, saves a snapshot of them so we can restore them later when the minigame ends.
     *
     * @returns {object|null} The movement speed modifier component if found, or null if it doesn't exist.
     */
    getOriginalMovementSpeedModifierSettings: function () {
        const movementSpeedModifierComponent = this.getMovementSpeedModifier();
        if (!movementSpeedModifierComponent) return null;
        if (!this.originalMovementSpeedModifierSettings) {
            this.originalMovementSpeedModifierSettings = {
                multiplier: movementSpeedModifierComponent.data.multiplier,
                linePatternInterval: movementSpeedModifierComponent.data.linePatternInterval,
                lineColor: movementSpeedModifierComponent.data.lineColor,
                joystickEnabled: movementSpeedModifierComponent.data.joystickEnabled,
                keyboardEnabled: movementSpeedModifierComponent.data.keyboardEnabled,
            };
        }
        return movementSpeedModifierComponent;
    },

    /**
     * Apply minigame boost level
     *
     * Sets the player speed boost settings for the given boost level, enables manual boost mode, and starts or resets the timer that will automatically remove the boost after a short duration.
     *
     * @param {number} boostLevel - The boost level to apply (1, 2, or 3).
     * @returns {void} Does not return a value.
     */
    applyMinigameBoostLevel: function (boostLevel) {
        const movementSpeedModifierComponent = this.getOriginalMovementSpeedModifierSettings();
        if (!movementSpeedModifierComponent) return;
        const boostSettingsByLevel = {
            1: { multiplier: 1.25, lineColor: '#ffffff', linePatternInterval: 100, lineOpacity: 0.1 },
            2: { multiplier: 1.4, lineColor: '#ababf5', linePatternInterval: 80, lineOpacity: 0.2 },
            3: { multiplier: 1.5, lineColor: '#f99898', linePatternInterval: 60, lineOpacity: 0.3 },
        };
        const boostSettings = boostSettingsByLevel[boostLevel];
        if (!boostSettings) return;
        // If a boost is already active, clear the existing timeout
        if (this.boostTimeoutId) {
            window.clearTimeout(this.boostTimeoutId);
        }
        this.currentBoostLevel = boostLevel;
        // Update boost settings on the movement speed modifier component
        this.movementSpeedModifierEl.setAttribute('movement-speed-modifier', {
            joystickEnabled: false,
            keyboardEnabled: false,
            multiplier: boostSettings.multiplier,
            lineColor: boostSettings.lineColor,
            linePatternInterval: boostSettings.linePatternInterval,
            lineOpacity: boostSettings.lineOpacity,
        });
        movementSpeedModifierComponent.setManualBoost(true); // Manually trigger boost effect
        // Set boost for a limited time
        this.boostTimeoutId = window.setTimeout(() => {
            this.expireMinigameBoost();
        }, this.boostDuration);
    },

    /**
     * Expire minigame boost
     *
     * Resets the player's speed boost back to normal after the boost timer runs out, restoring the original visual line settings and turning off the manual boost effect.
     *
     * @returns {void}
     */
    expireMinigameBoost: function () {
        this.boostTimeoutId = null;
        this.currentBoostLevel = 0;
        const movementSpeedModifierComponent = this.getMovementSpeedModifier();
        if (!movementSpeedModifierComponent) return;
        // Restore original settings except for joystick/keyboard enable which we want to keep off during the minigame
        const originalSettings = this.originalMovementSpeedModifierSettings;
        this.movementSpeedModifierEl.setAttribute('movement-speed-modifier', {
            joystickEnabled: false,
            keyboardEnabled: false,
            multiplier: 1,
            lineColor: originalSettings ? originalSettings.lineColor : movementSpeedModifierComponent.data.lineColor,
            linePatternInterval: originalSettings ? originalSettings.linePatternInterval : movementSpeedModifierComponent.data.linePatternInterval,
        });
        movementSpeedModifierComponent.setManualBoost(false); // Disable boost effect
    },

    /**
     * Restore movement settings
     *
     * Stops any active boost timer, resets the current boost level to normal, and puts the movement-speed-modifier values back to the saved original settings so player controls and visuals work the way they did before the minigame boost.
     *
     * @returns {void}
     */
    restoreMovementSpeedModifier: function () {
        // Remove timeout as it's no longer needed
        if (this.boostTimeoutId) {
            window.clearTimeout(this.boostTimeoutId);
            this.boostTimeoutId = null;
        }
        this.currentBoostLevel = 0; // Reset
        // Restore original settings
        const movementSpeedModifierComponent = this.getMovementSpeedModifier();
        if (!movementSpeedModifierComponent || !this.originalMovementSpeedModifierSettings) return;
        const originalSettings = this.originalMovementSpeedModifierSettings;
        this.movementSpeedModifierEl.setAttribute('movement-speed-modifier', {
            multiplier: originalSettings.multiplier,
            linePatternInterval: originalSettings.linePatternInterval,
            lineColor: originalSettings.lineColor,
            joystickEnabled: originalSettings.joystickEnabled,
            keyboardEnabled: originalSettings.keyboardEnabled,
        });
        movementSpeedModifierComponent.setManualBoost(false); // Turn off manual boost
    },

    /**
     * Show leaderboard
     *
     * Saves the player's completion time, fades out the HUD, builds and displays a leaderboard in front of the camera, highlights the player's entry, then fades and removes the leaderboard after a short delay.
     *
     * @param {number} playerTimeMs - The player's completion time in milliseconds to save and display on the leaderboard.
     * @param {object} [saveResult] - Object containing the results from saving the player's score, including the updated scores list, the player's rank index, and the sanitized player name (if in top 10). If not provided, the function will fetch scores from localStorage.
     * @returns {void} Does not return a value.
     */
    showLeaderboard: function (playerTimeMs, saveResult) {
        const subtitle = this.usedRegularMovementControls ? 'Standard Run' : 'Power Run';
        const resolvedSaveResult = saveResult || {
            scores: this.getSavedLocalScores(),
            playerRankIndex: -1, // They did not rank
        };
        // Gather some data for building the leaderboard
        const scores = resolvedSaveResult.scores;
        const playerNames = this.getLeaderboardPlayerNames(scores, 10);
        const playerRankIndex = resolvedSaveResult.playerRankIndex;
        const cameraEl = this.el.sceneEl.camera.el;

        // Remove the name input UI
        if (this.nameInputEl && this.nameInputEl.parentNode) {
            this.nameInputEl.parentNode.removeChild(this.nameInputEl);
        }
        this.nameInputEl = null;

        // Fade the HUD out first, then show the leaderboard once it's gone
        const hudFadeOutDurationMs = 500;
        if (this.hudEl) {
            this.hudEl.setAttribute('animation__fadeout', `property: object3D.visible; dur: ${hudFadeOutDurationMs}`);
            // Fade out opacity on the panel child
            const hudChildren = this.hudEl.querySelectorAll('[material], a-text');
            hudChildren.forEach(child => {
                const isText = child.tagName.toLowerCase() === 'a-text';
                const opacityProp = isText ? 'text.opacity' : 'material.opacity';
                child.setAttribute('animation__hudout', `property: ${opacityProp}; to: 0; dur: ${hudFadeOutDurationMs}; easing: easeInSine`);
            });
        }

        // Wait for HUD to finish fading before building the leaderboard
        window.setTimeout(() => {
            if (this.hudEl) this.hudEl.setAttribute('visible', false);

            const leaderboardContainerEl = document.createElement('a-entity');
            leaderboardContainerEl.setAttribute('position', '0 0.05 -1.7');

            // Build the monthly leaderboard on the left
            const monthlyPanel = this.createLeaderboardPanel({
                panelTitle: 'Monthly Leaderboard',
                subtitle,
                scores,
                playerNames,
                playerRankIndex,
                playerTimeMs,
                footerText: `${this.formatTime(playerTimeMs)}  YOUR SCORE`,
                footerWidth: '0.94',
                footerY: '-0.39',
                footerColor: '#5CFDCA',
                isFooterSmall: false,
            });
            monthlyPanel.panelEl.setAttribute('position', '-0.62 0 0');
            leaderboardContainerEl.appendChild(monthlyPanel.panelEl);

            // Build the all-time leaderboard on the right
            const allTimeFooterText = this.usedRegularMovementControls
                ? 'Try using arm-swing locomotion only to make it onto the Power Run leaderboard.'
                : '';
            const allTimePanel = this.createLeaderboardPanel({
                panelTitle: 'All-Time Leaderboard',
                subtitle,
                scores,
                playerNames,
                playerRankIndex,
                playerTimeMs,
                footerText: allTimeFooterText,
                footerWidth: this.usedRegularMovementControls ? '0.78' : '0.94',
                footerY: '-0.39',
                footerColor: '#5CFDCA',
                isFooterSmall: this.usedRegularMovementControls,
            });
            allTimePanel.panelEl.setAttribute('position', '0.62 0 0');
            leaderboardContainerEl.appendChild(allTimePanel.panelEl);

            const allLeaderboardPanelEls = [monthlyPanel.panelBackgroundEl, allTimePanel.panelBackgroundEl];
            const allLeaderboardTextEls = monthlyPanel.textEls.concat(allTimePanel.textEls);

            cameraEl.appendChild(leaderboardContainerEl);
            this.leaderboardEl = leaderboardContainerEl;

            // After 15 seconds, fade out the panel and all text, then remove the entity
            const fadeOutDurationMs = 800;
            window.setTimeout(() => {
                if (!this.leaderboardEl) return;
                allLeaderboardPanelEls.forEach(panelEl => {
                    panelEl.setAttribute('animation__fadeout', `property: material.opacity; from: 0.8; to: 0; dur: ${fadeOutDurationMs}; easing: easeInSine`);
                });
                allLeaderboardTextEls.forEach(textEl => {
                    textEl.setAttribute('animation__fadeout', `property: text.opacity; from: 1; to: 0; dur: ${fadeOutDurationMs}; easing: easeInSine`);
                });
                window.setTimeout(() => {
                    if (this.leaderboardEl && this.leaderboardEl.parentNode) {
                        this.leaderboardEl.parentNode.removeChild(this.leaderboardEl);
                        this.leaderboardEl = null;
                    }
                }, fadeOutDurationMs + 100);
            }, 15000);
        }, hudFadeOutDurationMs + 100);
    },

    tick: function (time, timeDelta) {
        if (!this.orbs.length || this.hasCollectedAllOrbs) return; // Exit if no orbs or game is already completed

        // Track player location
        const sceneCamera = this.el.sceneEl.camera;
        if (!sceneCamera) return;
        sceneCamera.getWorldPosition(this.cameraWorldPosition); // Update this.cameraWorldPosition each frame to keep track of where the player is in the world

        this.updateSpeedHud(timeDelta);

        // Only check for orb collection every 10 frames for performance
        this.tickFrameCounter++;
        if (this.tickFrameCounter < 10) return;
        this.tickFrameCounter = 0;

        const collectRadiusSquared = this.data.collectRadius * this.data.collectRadius;

        // Update HUD timer while the game is in progress
        if (this.gameStartTime !== null && this.hudTimerTextEl) {
            this.hudTimerTextEl.setAttribute('value', this.formatTime(Date.now() - this.gameStartTime));
        }

        // Check each orb to see if the player is within collect radius.  If so, mark orb as collected, hide it, and play sounds as needed.
        for (const orb of this.orbs) {
            // If orb is already collected, skip to the next one.
            if (orb.collected) continue;
            // If the player is too far from the orb, skip to the next one.
            const deltaX = this.cameraWorldPosition.x - orb.pos.x;
            const deltaY = this.cameraWorldPosition.y - orb.pos.y;
            const deltaZ = this.cameraWorldPosition.z - orb.pos.z;
            if (deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ > collectRadiusSquared) continue;
            // Player is within collect radius of this orb, mark it as collected and hide it
            orb.collected = true;
            orb.el.setAttribute('visible', false);
            this.collected++;

            // On the first orb: start the timer and show the HUD
            if (this.collected === 1) {
                // Retry controller lookup once when the run starts in case it loaded after init.
                if (!this.leftControllerEl) {
                    this.leftControllerEl = this.el.sceneEl.querySelector(this.leftControllerSelector);
                    if (this.leftControllerEl) {
                        this.leftControllerEl.addEventListener('axismove', this.trackLeftJoystickUsage);
                    }
                }
                this.releaseLeftShift(); // Make sure shift is released to not interfere with the minigame boost
                this.gameStartTime = Date.now();
                if (this.hudEl) this.hudEl.setAttribute('visible', true);
            }

            // Apply boost whenever an orb is collected
            this.applyMinigameBoostLevel(Math.min(this.currentBoostLevel + 1, 3) || 1);

            // Update orb count display on HUD
            if (this.hudOrbCountTextEl) {
                this.hudOrbCountTextEl.setAttribute('value', `${this.collected} / ${this.orbs.length} orbs`);
            }

            // Play collect sound if specified
            if (this.data.collectSound) {
                const collectSoundEl = document.querySelector(this.data.collectSound);
                if (collectSoundEl && collectSoundEl.components && collectSoundEl.components.sound) {
                    collectSoundEl.components.sound.playSound();
                }
            }

            // If all orbs are collected, freeze game timer, restore movement speed, show leaderboard, and play victory sound
            if (this.collected >= this.orbs.length) {
                this.hasCollectedAllOrbs = true;
                const finalTimeMs = Date.now() - this.gameStartTime;
                this.restoreMovementSpeedModifier(); // Restore normal speed
                // Update timer one last time to show the final time
                if (this.hudTimerTextEl) {
                    this.hudTimerTextEl.setAttribute('value', this.formatTime(finalTimeMs));
                }
                // Show the leaderboard with the player's final time
                this.promptForLeaderboardName(finalTimeMs);
                // Play all collected sound if specified
                if (this.data.allCollectedSound) {
                    const allCollectedSoundEl = document.querySelector(this.data.allCollectedSound);
                    if (allCollectedSoundEl && allCollectedSoundEl.components && allCollectedSoundEl.components.sound) {
                        allCollectedSoundEl.components.sound.playSound();
                    }
                }
                return;
            }
        }
    },

    remove: function () {
        this.restoreMovementSpeedModifier();
        window.removeEventListener('keydown', this.blockShiftDuringMinigame, true);
        window.removeEventListener('keyup', this.blockShiftDuringMinigame, true);
        window.removeEventListener('keydown', this.trackKeyboardUsage);
        if (this.leftControllerEl) {
            this.leftControllerEl.removeEventListener('axismove', this.trackLeftJoystickUsage);
        }
        // Remove orbs if component is removed from the scene
        this.orbs.forEach(orb => {
            if (orb.el && orb.el.parentNode) orb.el.parentNode.removeChild(orb.el);
        });
        this.orbs = [];
        this.hasCollectedAllOrbs = false;
        // Remove HUD and leaderboard if they exist
        if (this.hudEl && this.hudEl.parentNode) {
            this.hudEl.parentNode.removeChild(this.hudEl);
            this.hudEl = null;
        }
        if (this.leaderboardEl && this.leaderboardEl.parentNode) {
            this.leaderboardEl.parentNode.removeChild(this.leaderboardEl);
            this.leaderboardEl = null;
        }
        // Remove name input if it exists
        if (this.nameInputEl && this.nameInputEl.parentNode) {
            this.nameInputEl.parentNode.removeChild(this.nameInputEl);
            this.nameInputEl = null;
        }
    }
};
AFRAME.registerComponent("orb-collection-minigame", orbCollectionMinigame);