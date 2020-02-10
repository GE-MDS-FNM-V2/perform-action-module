const path = require('path')

const libraryName = "perform-action-module"

const createConfig = ({
    libraryTarget,
    target
}) => {
    return {
        entry: './src/index.ts',
        devtool: 'inline-source-map',
        mode: 'production',
        target,
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              use: 'ts-loader',
              exclude: /node_modules/
            }
          ]
        },
        resolve: {
          extensions: ['.tsx', '.ts', '.js']
        },
        output: {
          filename: `bundle-${target}.js`,
          path: path.resolve(__dirname, 'dist'),
          library: libraryName,
          libraryTarget
        }
      }
}

module.exports = [
    createConfig({libraryTarget: "umd", target: "web"}),
    createConfig({libraryTarget: "umd", target: "node"})
]
