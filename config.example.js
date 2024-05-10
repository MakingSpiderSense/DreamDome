// config.js
document.addEventListener('DOMContentLoaded', () => {
    const configSettings = {
        // Custom settings
        'enableVrLogger': false,
    };

    Object.keys(configSettings).forEach(key => {
        localStorage.setItem(key, configSettings[key]);
    });
});
