import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: "dist/atv.js",
      format: "cjs",
      sourcemap: false,
    },
    {
      file: "dist/atv.min.js",
      format: "cjs",
      sourcemap: false,
      compact: true,
    },
  ],
  plugins: [
    resolve({ jsnext: true, extensions: [".ts"], rootDir: "./src" }),
    typescript(),
    commonjs(),
  ],
};
