const {
  withAndroidManifest,
} = require("@expo/config-plugins");

module.exports = function withOptionalCamera(config) {
  return withAndroidManifest(
    config,
    async (config) => {
      const manifest =
        config.modResults.manifest;

      manifest["uses-feature"] =
        manifest["uses-feature"] || [];

      const requiredFeatures = [
        "android.hardware.camera",
        "android.hardware.camera.autofocus",
        "android.hardware.camera.any",
      ];

      for (const featureName of requiredFeatures) {
        const existingFeature =
          manifest["uses-feature"].find(
            (feature) =>
              feature?.$?.[
                "android:name"
              ] === featureName
          );

        if (existingFeature) {
          existingFeature.$[
            "android:required"
          ] = "false";
        } else {
          manifest["uses-feature"].push({
            $: {
              "android:name":
                featureName,
              "android:required":
                "false",
            },
          });
        }
      }

      return config;
    }
  );
};