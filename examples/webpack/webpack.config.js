const path = require('path');

module.exports = {
  entry: './entry.js',
  output: {
    path: path.resolve(__dirname, "."),
    filename: 'bundle.js'
  },
  resolve: {
   // options for resolving module requests
   // (does not apply to resolving to loaders)

    modules: [
     "node_modules",
     path.resolve(__dirname, '../../src')
    ],
  }
};
