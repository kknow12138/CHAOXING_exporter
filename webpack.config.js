const path = require('path');

module.exports = {
  entry: {
    'background/service-worker': './src/service-worker.js'
  },
  output: {
    path: path.resolve(__dirname),
    filename: '[name].js'
  },
  mode: 'production',
  target: 'webworker',
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "stream": false
    }
  }
};
