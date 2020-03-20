const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const srcDir = '../src/';

module.exports = {
    entry: {
        content_script: path.join(__dirname, srcDir + 'content_script.ts'),
        background: path.join(__dirname, srcDir + 'background.ts')
        // style: path.join(__dirname, srcDir + 'style.css')
    },
    output: {
        path: path.join(__dirname, '../dist/js'),
        filename: '[name].js'
    },
    optimization: {
        splitChunks: {
            name: 'vendor',
            chunks: "initial"
        }
    },
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
        extensions: ['.ts', '.tsx', '.js', '.css']
    },
    plugins: [
        // exclude locale files in moment
        new webpack.IgnorePlugin(/^\.\/locale$/),
        new CopyPlugin([
            { from: '.', to: '../' }
        ],
            { context: 'public' }
        ),
    ]
};
