import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import sucrase from '@rollup/plugin-sucrase';
import dts from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import svgr from '@svgr/rollup';

const packageJson = require('./package.json');

export default [
  {
    input: 'src/index.module.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named'
      }
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
      postcss(),
      svgr({ exportType: 'named', jsxRuntime: 'classic', exportAsDefault: true, dimensions: false }),
      sucrase({
        exclude: ['node_modules/**'],
        transforms: ['typescript']
      })
    ],
    external: ['react', 'react-dom'],
    context: 'this'
  },
  {
    input: 'dist/esm/types/index.module.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts.default()],
    external: [/\.scss$/, /\.css$/]
  }
];
