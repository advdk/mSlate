import type { Configuration as WebpackConfig } from 'webpack';
import type { Configuration as DevServerConfig } from 'webpack-dev-server';
import * as path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

type Configuration = WebpackConfig & { devServer?: DevServerConfig };

const rules = [
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: { transpileOnly: true },
    },
  },
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
];

const config: Configuration = {
  mode: 'development',
  entry: './src/renderer.ts',
  output: {
    path: path.resolve(__dirname, 'dist-dev'),
    filename: 'renderer.js',
  },
  module: { rules },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      logger: 'webpack-infrastructure',
      typescript: {
        configFile: path.resolve(__dirname, 'tsconfig.web.json'),
      },
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
  devServer: {
    static: false,
    port: 3333,
    hot: true,
    open: false,
    historyApiFallback: true,
  },
  devtool: 'source-map',
};

export default config;
