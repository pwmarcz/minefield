var MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = [
  {
    name: 'js',
    entry: {
      app: "./js/index.js",
    },
    output: {
      path: __dirname + '/static/',
      filename: 'bundle.auto.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          query: { presets: ['@babel/preset-env', '@babel/preset-react'] },
        },
      ]
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[/]node_modules[/]/,
            name: 'vendor',
            chunks: 'all',
            filename: 'bundle-vendor.auto.js',
          }
        }
      }
    }
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
      path: __dirname + '/static/css/',
      filename: 'bundle-css.auto.js',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader?-url',
            'sass-loader',
          ],
          exclude: /node_modules/,
        },
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
          filename: 'bundle-css.auto.css'
        })
    ]
  }
];
