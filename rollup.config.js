import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "./src/index.js",
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
  plugins: [resolve({ jsnext: true }), commonjs()],
};
