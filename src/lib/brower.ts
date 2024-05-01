export const addDeviceOrientationListener = (
  callback: (e: DeviceOrientationEvent) => void
) => {
  // Check if DeviceOrientationEvent is available in the window object
  if (typeof DeviceOrientationEvent !== "undefined") {
    // Check if permission is needed for DeviceOrientationEvent (iOS 13+)
    // @ts-ignore
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      console.log("Requesting permission for DeviceOrientation");

      // Request permission
      //@ts-ignore
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            // Permission granted
            console.log("Permission granted for DeviceOrientation");

            // Add event listener if permission granted
            window.addEventListener("deviceorientation", callback);
          } else {
            // Permission denied
            console.log("Permission denied for DeviceOrientation");
          }
        })
        .catch(console.error); // Handle potential errors in requesting permission
    } else {
      // Permissions API not needed, just add event listener
      window.addEventListener("deviceorientation", callback);
    }
  } else {
    console.log("DeviceOrientationEvent is not supported by this browser.");
  }
};
