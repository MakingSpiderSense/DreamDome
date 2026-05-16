/**
 * Reset Local Storage
 *
 * ✏️ Not sure if this is still used. Look into.
 */
const resetStorage = {
    init: function () {
        localStorage.setItem('movementState', 'inactive');
    }
};
AFRAME.registerComponent('reset-storage', resetStorage);