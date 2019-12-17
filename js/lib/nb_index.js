// Entry point for the notebook bundle containing custom model definitions.
//
// Setup notebook base URL
//
// Some static assets may be required by the custom widget javascript. The base
// url for the notebook is not known at build time and is therefore computed
// dynamically.
__webpack_public_path__ = document.querySelector('body').getAttribute(
    'data-base-url') + 'nbextensions/yt-widgets/';
// Export widget models and views, and the npm package version number.
module.exports = require('./image_canvas.js');
module.exports['version'] = require('../package.json').version;