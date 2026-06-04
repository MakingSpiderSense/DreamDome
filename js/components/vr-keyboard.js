/**
 * VR keyboard component
 *
 * Provides an interactive in-world A-Frame keyboard for entering text with letter keys, case toggling, deletion, cancel, max-length enforcement, and submit event emission. Emits a "keyboard-submit" event with the entered text when the user clicks the submit button.
 */
const vrKeyboard = {
    schema: {
        label: { default: "Enter Text:" },
        keyBgColor: { default: "#ffffff" },
        keyBgHoverColor: { default: "#f2f2f2" },
        keyTextColor: { default: "#000000" },
        depressOnHover: { default: true },
        maxLength: { default: 12 },
        defaultValue: { default: '' },
    },

    /**
     * Clean and limit input
     *
     * Takes any input, converts it to text, removes everything except letters A-Z, and shortens it to the maxLength so the value is always valid.
     *
     * @param {*} value - The raw value to clean.
     * @returns {string} The sanitized string containing only letters, limited to the configured maximum length.
     */
    sanitizeValue(value) {
        return String(value ?? "")
            .replace(/[^A-Za-z]/g, "")
            .slice(0, this.data.maxLength);
    },

    init() {
        this.inputValue = this.sanitizeValue(this.data.defaultValue); // Whatever the user has typed so far
        this.isUppercase = true; // Track keyboard case state
        this.didAutoSwitchToLowercase = false; // Track if we've auto-switched to lowercase after first letter input
        this.letterButtons = []; // We later store all letters here so we can update their labels when switching cases
        this.render();
    },

    update(oldData) {
        if (!oldData) return;

        // If no relevant data has changed, skip re-rendering to preserve input and state
        if (
            oldData.label === this.data.label &&
            oldData.keyBgColor === this.data.keyBgColor &&
            oldData.keyBgHoverColor === this.data.keyBgHoverColor &&
            oldData.keyTextColor === this.data.keyTextColor &&
            oldData.depressOnHover === this.data.depressOnHover &&
            oldData.maxLength === this.data.maxLength
        ) {
            return;
        }

        this.render();
        this.updateDisplay();
    },

    /**
     * Get keyboard letters
     *
     * Builds and returns an array of all alphabet letters based on the current case mode (uppercase or lowercase).
     *
     * @returns {string[]} An array of 26 letters in uppercase when `isUppercase` is true, otherwise lowercase.
     */
    getLetters() {
        const letters = "abcdefghijklmnopqrstuvwxyz"; // All possible letters
        // Return based on current case state
        return (this.isUppercase ? letters.toUpperCase() : letters).split("");
    },

    /**
     * Refresh raycasters
     *
     * Tells all raycaster elements in the scene to re-scan for objects they can interact with. This is useful after adding or removing the keyboard, so the raycasters don't miss the keys.
     *
     * @returns {void} Does not return a value.
     */
    refreshRaycasters() {
        requestAnimationFrame(() => { // On next frame...
            document.querySelectorAll("[raycaster]").forEach((rayEl) => {
                const raycaster = rayEl.components.raycaster;
                if (!raycaster) return;
                raycaster.refreshObjects(); // Re-scan for interactable objects
                raycaster.checkIntersections?.(); // Immediately check for intersections in case the user is already pointing at the keyboard when it appears
            });
        });
    },

    /**
     * Render keyboard layout
     *
     * Builds and displays the full VR keyboard UI by clearing old elements, adding the panel and display text, and creating letter keys with click behavior for typing input.
     *
     * @returns {void} Does not return a value.
     */
    render() {
        this.letterButtons = []; // Reset letter buttons array on each render

        // Set up background panel and initial display text
        this.el.innerHTML = `
            <a-plane width="3.2" height="1.75" color="#111" opacity="0.9"></a-plane>
            <a-text id="name-display" value="${this.data.label}" align="center" width="2.6" position="0 .58 .03"></a-text>
        `;

        // Add buttons for each letter with click behavior
        this.getLetters().forEach((letter, i) => {
            this.addButton(
                letter, // Label
                -1.2 + (i % 13) * 0.2, // X position (13 letters per row, 0.2 spacing)
                i < 13 ? 0.24 : 0.0, // Y position (two rows at either 0.24 or 0.0)
                () => {
                    // On click behavior
                    if (this.inputValue.length >= this.data.maxLength) return; // If input at max length, ignore additional input
                    this.inputValue += this.getLetters()[i]; // Add clicked letter to input value
                    this.updateDisplay(); // Add letter to display
                    this.autoSwitchToLowercase(); // Switch cases after the first key press
                },
                0.16, // Button width
                true, // Is letter button (for case toggling)
            );
        });

        // Add case toggle button
        this.addButton(
            this.isUppercase ? "abc" : "ABC", // Label
            -1.02, // X position
            -0.42, // Y position
            () => {
                // On click behavior
                this.isUppercase = !this.isUppercase; // Toggle case state
                this.updateLetterButtons(); // Switch casing label
            },
            0.42, // Button width
            false, // Is letter button
            "case-toggle", // Base ID for button and text
        );

        // Add delete button
        this.addButton(
            "DEL", // Label
            -0.18, // X position
            -0.42, // Y position
            () => {
                // On click behavior
                this.inputValue = this.inputValue.slice(0, -1); // Remove last character from input
                this.updateDisplay(); // Update display to reflect removed character
            },
            0.3, // Button width
        );

        // Add cancel button
        this.addButton(
            "CANCEL", // Label
            0.29, // X position
            -0.42, // Y position
            () => {
                this.el.emit("keyboard-cancel");
            },
            0.54, // Button width
        );

        // Add submit button
        this.addButton(
            "SUBMIT", // Label
            0.92, // X position
            -0.42, // Y position
            () => {
                // On click behavior
                const trimmedValue = this.inputValue.trim();
                if (!trimmedValue) return;
                // Emit keyboard-submit event with trimmed input value
                this.el.emit("keyboard-submit", { value: trimmedValue });
            },
            0.62, // Button width
        );

        this.refreshRaycasters();
    },

    /**
     * Create and wire a keyboard button
     *
     * Creates a 3D key and matching text label, applies hover/click behavior, optionally assigns IDs, and appends both elements to the keyboard so users can interact with them in VR.
     *
     * @param {string} label The text shown on the button.
     * @param {number} xPosition The horizontal position of the button.
     * @param {number} yPosition The vertical position of the button.
     * @param {Function} onClick The function to run when the button is clicked.
     * @param {number} [btnWidth=0.16] The button width.
     * @param {boolean} [isLetterButton=false] Whether this button is a letter key that should be tracked for case updates.
     * @param {string} [id=""] Optional ID base to assign to the button and its text element.
     * @returns {void} Does not return a value.
     */
    addButton(label, xPosition, yPosition, onClick, btnWidth = 0.16, isLetterButton = false, id = "") {
        const bgColor = this.data.keyBgColor;
        const bgHoverColor = this.data.keyBgHoverColor;
        const depressOnHover = this.data.depressOnHover;
        const defaultButtonZ = 0.06;
        const hoverButtonZ = 0.04;
        const defaultTextZ = 0.1;
        const hoverTextZ = 0.08;

        // Create button box
        const btn = document.createElement("a-box");
        btn.setAttribute("class", "interactable");
        btn.setAttribute("width", btnWidth);
        btn.setAttribute("height", ".18");
        btn.setAttribute("depth", ".04");
        btn.setAttribute("color", bgColor);
        btn.setAttribute("material", "shader: flat; opacity: 1; transparent: false;");
        btn.setAttribute("position", `${xPosition} ${yPosition} ${defaultButtonZ}`);
        btn.addEventListener("click", onClick);

        // Create button text
        const txt = document.createElement("a-text");
        txt.setAttribute("value", label);
        txt.setAttribute("align", "center");
        txt.setAttribute("anchor", "center");
        txt.setAttribute("baseline", "center");
        txt.setAttribute("color", this.data.keyTextColor);
        txt.setAttribute("width", "1.5");
        txt.setAttribute("position", `${xPosition} ${yPosition} ${defaultTextZ}`);

        // Hover effects
        btn.addEventListener("raycaster-intersected", () => {
            btn.setAttribute("color", bgHoverColor);
            if (depressOnHover) {
                btn.setAttribute("position", `${xPosition} ${yPosition} ${hoverButtonZ}`);
                txt.setAttribute("position", `${xPosition} ${yPosition} ${hoverTextZ}`);
            }
        });

        // Reset on hover out
        btn.addEventListener("raycaster-intersected-cleared", () => {
            btn.setAttribute("color", bgColor);
            btn.setAttribute("position", `${xPosition} ${yPosition} ${defaultButtonZ}`);
            txt.setAttribute("position", `${xPosition} ${yPosition} ${defaultTextZ}`);
        });

        // Assign IDs if provided (for testing or styling)
        if (id) {
            btn.id = id;
            txt.id = `${id}-text`;
        }

        // Append button and text to keyboard
        this.el.appendChild(btn);
        this.el.appendChild(txt);

        // Track letter buttons for case toggling
        if (isLetterButton) {
            this.letterButtons.push({ txt });
        }
    },

    /**
     * Update letter button labels
     *
     * Loops through all the letter buttons on the keyboard and updates their displayed text to match the current case (uppercase or lowercase), then also updates the case toggle button label to show the opposite case.
     *
     * @returns {void} Does not return a value.
     */
    updateLetterButtons() {
        const letters = this.getLetters();
        // Update letter buttons to match current case
        this.letterButtons.forEach((buttonSet, i) => {
            buttonSet.txt.setAttribute("value", letters[i]);
        });
        // Update case toggle button label
        this.el.querySelector("#case-toggle-text")?.setAttribute("value", this.isUppercase ? "abc" : "ABC");
    },

    /**
     * Auto switch to lowercase
     *
     * Automatically switches the keyboard to lowercase after the user types their first letter to hint that they can switch cases. It only does this once.
     *
     * @returns {void} Does not return a value.
     */
    autoSwitchToLowercase() {
        if (this.didAutoSwitchToLowercase) return; // Make sure to only auto-switch once
        // Update flags
        this.didAutoSwitchToLowercase = true;
        this.isUppercase = false;
        this.updateLetterButtons(); // Update buttons to reflect new case
    },

    /**
     * Update display text
     *
     * Finds the display text element and updates it to show the label plus the current typed input so the user can see what they have entered.
     *
     * @returns {void} Does not return a value.
     */
    updateDisplay() {
        this.el.querySelector("#name-display")?.setAttribute("value", `${this.data.label} ${this.inputValue}`);
    },
};
AFRAME.registerComponent("vr-keyboard", vrKeyboard);