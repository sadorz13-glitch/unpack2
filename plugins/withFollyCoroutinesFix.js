const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# FOLLY_COROUTINES_FIX';

const FIX_LINES = `
    ${MARKER}
    # Workaround: Xcode 16+ / iOS 26 SDK enables C++20 coroutines so FOLLY_HAS_COROUTINES
    # evaluates truthy, but folly's CocoaPods distribution omits the coro/ subdirectory.
    # Force it off for all pods to prevent the missing-header compile failure.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_HAS_COROUTINES=0')
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_HAS_COROUTINES=0'
        end
      end
    end`;

const withFollyCoroutinesFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      // Idempotent — skip if already applied
      if (podfile.includes(MARKER)) {
        return config;
      }

      if (podfile.includes('post_install do |installer|')) {
        // Merge into Expo's existing post_install block
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${FIX_LINES}`
        );
      } else {
        // No existing block — create one before the final closing 'end'
        const newBlock = `\n\npost_install do |installer|\n${FIX_LINES}\nend\n`;
        podfile = podfile.replace(/(\nend\s*)$/, `${newBlock}$1`);
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withFollyCoroutinesFix;
