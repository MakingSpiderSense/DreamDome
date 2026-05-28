/**
 * Desktop modal input
 *
 * Creates and manages a desktop-only modal overlay that collects a sanitized alphabetic name value, supports cancel/submit actions, and emits the `desktop-modal-input-submit` event with the cleaned value on submit.
 */
const desktopModalInput = {
    schema: {
        label: { default: "Enter Name" },
        helpText: { default: "Letters only, max 12 characters" },
        maxLength: { default: 12 },
    },

    init() {
        this.showOverlay();
    },

    /**
     * Clean and limit input
     *
     * Takes any input, converts it to text, removes everything except letters A-Z, and shortens it to the maxLength so the value is always valid for this component.
     *
     * @param {*} value - The raw value to clean (such as text typed by the user).
     * @returns {string} The sanitized string containing only letters, limited to the configured maximum length.
     */
    sanitizeValue(value) {
        return String(value ?? "")
            .replace(/[^A-Za-z]/g, "")
            .slice(0, this.data.maxLength);
    },

    /**
     * Show modal overlay
     *
     * Creates and shows a centered modal input overlay on the page, or focuses the existing input if one is already open.
     *
     * @returns {void} This function does not return a value.
     */
    showOverlay() {
        // If an input already exists, just focus it instead of creating a new one
        const existingInput = document.querySelector("#desktop-modal-input-field");
        if (existingInput) {
            existingInput.focus();
            return;
        }

        // Create overlay elements
        const overlay = document.createElement("div");
        overlay.id = "desktop-modal-input";
        overlay.style.cssText = [
            "position: fixed",
            "inset: 0",
            "display: flex",
            "align-items: center",
            "justify-content: center",
            "background: rgba(0, 0, 0, 0.45)",
            "z-index: 9999",
        ].join(";");

        // Create modal panel
        const panel = document.createElement("div");
        panel.style.cssText = [
            "width: min(90vw, 360px)",
            "padding: 20px",
            "border-radius: 14px",
            "background: #ffffff",
            "box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35)",
            "font-family: Arial, sans-serif",
            "display: flex",
            "flex-direction: column",
            "gap: 12px",
        ].join(";");

        // Create title
        const title = document.createElement("div");
        title.textContent = this.data.label;
        title.style.cssText = "font-size: 20px; font-weight: 700; color: #111; text-align: center;";

        // Create help text
        const helpText = document.createElement("div");
        helpText.textContent = this.data.helpText;
        helpText.style.cssText = "font-size: 13px; color: #555; text-align: center;";

        // Create input field
        const input = document.createElement("input");
        input.id = "desktop-modal-input-field";
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.maxLength = this.data.maxLength;
        input.style.cssText = [
            "width: 100%",
            "padding: 12px 14px",
            "border: 1px solid #bbb",
            "border-radius: 10px",
            "font-size: 18px",
            "text-align: center",
            "box-sizing: border-box",
        ].join(";");

        // Sanitize input on every change to enforce character restrictions immediately
        input.addEventListener("input", () => {
            input.value = this.sanitizeValue(input.value);
        });

        // Create button container
        const buttonRow = document.createElement("div");
        buttonRow.style.cssText = "display: flex; gap: 10px; justify-content: center;";

        // Create "Cancel" button
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        cancelButton.style.cssText = [
            "padding: 10px 16px",
            "border: 1px solid #bbb",
            "border-radius: 10px",
            "background: #f3f3f3",
            "color: #111",
            "cursor: pointer",
        ].join(";");

        // Create "Submit" button
        const submitButton = document.createElement("button");
        submitButton.type = "button";
        submitButton.textContent = "Submit";
        submitButton.style.cssText = [
            "padding: 10px 16px",
            "border: 0",
            "border-radius: 10px",
            "background: #111",
            "color: #fff",
            "cursor: pointer",
        ].join(";");

        /**
         * Remove the overlay entirely from the DOM
         *
         * @param {boolean} wasSubmitted - True when the input closed after it was submitted, false when it closed from cancellation.
         */
        const closeOverlay = (wasSubmitted = false) => {
            if (!wasSubmitted) {
                this.el.emit("desktop-modal-input-cancel");
            }
            this.el.remove();
        };
        /**
         * Emit `desktop-modal-input-submit` event and close the overlay
         */
        const submitValue = () => {
            const value = this.sanitizeValue(input.value); // Sanitize again
            if (!value) return;
            // Emit custom event and close overlay
            this.el.emit("desktop-modal-input-submit", { value });
            closeOverlay(true);
        };

        // Add event listeners for buttons
        cancelButton.addEventListener("click", () => closeOverlay(false));
        submitButton.addEventListener("click", submitValue);

        // Add event listeners for Enter and Escape keys for better UX and prevent repeat character issue
        input.addEventListener("keydown", (evt) => {
            // Prevent holding down a letter key from flooding input with repeated characters. This is needed since the WASD keys are used for movement and will likely be held down when the input appears
            if (evt.repeat && /^[a-z]$/i.test(evt.key)) {
                evt.preventDefault();
                return;
            }

            // Enter submits the form
            if (evt.key === "Enter") {
                evt.preventDefault();
                submitValue();
            }

            // Escape cancels and closes the overlay
            if (evt.key === "Escape") {
                evt.preventDefault();
                closeOverlay(false);
            }
        });

        // Assemble all created elements into the DOM
        buttonRow.appendChild(cancelButton);
        buttonRow.appendChild(submitButton);
        panel.appendChild(title);
        panel.appendChild(helpText);
        panel.appendChild(input);
        panel.appendChild(buttonRow);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        this.overlay = overlay; // Store reference to overlay for later removal if needed
        input.focus(); // Focus input
    },

    remove() {
        this.overlay?.remove(); // Remove overlay if it exists
    },
};
AFRAME.registerComponent("desktop-modal-input", desktopModalInput);