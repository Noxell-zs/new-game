'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

/** @type {'production' | 'development'} */
const mode = 'production';

const defaultConfig = {
  name: 'default',
  // mode,
  context: path.resolve(__dirname, 'src'),
  entry: {
    main: './main.ts',
  },

  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },

  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
    },
    minimizer: [new CssMinimizerPlugin(), new TerserPlugin()],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      minify: true,
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    new CopyPlugin({
      patterns: [
        {from: 'static', to: 'static'},
        'sw.js',
        {from: '../node_modules/@magenta/music/es6/core.js', to: 'core.js'},
        {
          from: '../node_modules/@magenta/music/es6/music_rnn.js',
          to: 'music_rnn.js',
        },
        {
          from: '../node_modules/@magenta/music/es6/music_vae.js',
          to: 'music_vae.js',
        },
        {
          from: '../node_modules/@tensorflow/tfjs/dist/tf.min.js',
          to: 'tf.min.js',
        },
      ],
    }),
  ],

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.wgsl$/,
        use: {
          loader: 'ts-shader-loader',
        },
      },
    ],
  },

  resolve: {extensions: ['.ts', '.js']},

  devServer: {
    port: 8000,
    open: true,
    hot: true,
    liveReload: true,
  },
};

module.exports = defaultConfig;
