const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, '../../node_modules/terrender-core/webworkerPng/workerBundlePng.js'), to: path.resolve(__dirname, 'dist') },
        { from: path.resolve(__dirname, '../../node_modules/terrender-core/webworkerTiffColor/workerBundleTiffColor.js'), to: path.resolve(__dirname, 'dist') },
        { from: path.resolve(__dirname, '../../node_modules/terrender-core/webworkerTiffHeight/workerBundleTiffHeight.js'), to: path.resolve(__dirname, 'dist') }
      ],
    }),
    new CleanWebpackPlugin(),
  ],
  mode: 'development',
  devServer: {
    proxy: [
      {
        context: ['/config', '/geom', '/asset'],
        target: 'http://localhost:3000',
      },
    ],
  },
};
