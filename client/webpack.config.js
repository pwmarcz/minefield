module.exports = [
  {
    name: 'js',
    entry: "./js/index.js",
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
