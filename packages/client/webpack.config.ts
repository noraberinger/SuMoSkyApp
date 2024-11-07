import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import "webpack-dev-server";

const config: webpack.Configuration = {
  entry: "./src/index.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(glsl|frag|vert)$/,
        use: "webpack-glsl-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".css", ".frag", ".vert"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/index.html"),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(
            __dirname,
            "../../node_modules/terrender-core/webworkerPng/workerBundlePng.js",
          ),
          to: path.resolve(__dirname, "dist"),
        },
        {
          from: path.resolve(
            __dirname,
            "../../node_modules/terrender-core/webworkerTiffColor/workerBundleTiffColor.js",
          ),
          to: path.resolve(__dirname, "dist"),
        },
        {
          from: path.resolve(
            __dirname,
            "../../node_modules/terrender-core/webworkerTiffHeight/workerBundleTiffHeight.js",
          ),
          to: path.resolve(__dirname, "dist"),
        },
      ],
    }),
    new CleanWebpackPlugin(),
  ],
  mode: "development",
  devServer: {
    proxy: [
      {
        context: ["/config", "/geom", "/asset", "/textures"],
        target: "http://localhost:3000",
      },
    ],
  },
};

export default config;
