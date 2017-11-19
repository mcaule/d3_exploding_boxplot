import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'src/d3_exploding_boxplot.js',
  format: 'umd',
  moduleName: 'd3_exploding_boxplot',
  dest: 'dist/d3_exploding_boxplot.min.js',
  external: ['d3', 'd3-tip'],
  globals: {
    d3: 'd3'
  },

  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**' // only transpile our source code
    })
    // , uglify()
  ],
};
