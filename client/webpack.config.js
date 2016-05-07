var CommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;

module.exports = [
  {
    name: 'js',
    entry: {
      vendor: ['react', 'react-dom', 'redux', 'react-redux'],
      app: "./js/index.js",
    },
    output: {
      path: __dirname + '/static/',
      filename: 'bundle.auto.js',
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          query: { presets: ['es2015', 'react'] },
        },
      ]
    },
    plugins: [
      new CommonsChunkPlugin({
        name: "vendor",
        filename: "bundle-vendor.auto.js",
        minChunks: Infinity,
      })
    ]
  },
  {
    name: 'css',
    entry: {
      styles: [
        './static/scss/default.scss',
        './static/scss/sprites.scss',
      ],
    },
    output: {
      path: __dirname + '/static/',
      filename: 'bundle-css.auto.js',
    },
    module: {
      loaders: [
        {
          test: /\.scss$/,
          loaders: ['style', 'css?-url', 'sass'],
          exclude: /node_modules/,
        },
      ]
    },
  }
];
