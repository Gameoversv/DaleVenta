import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships flat configs directly, so they are spread in as-is.
 *
 * The previous setup routed them through `FlatCompat.extends()`, which treats its argument as a
 * legacy eslintrc config and serialises it when reporting validation errors. A flat config's
 * plugin objects are self-referential, so that serialisation threw `Converting circular structure
 * to JSON` and no file was ever linted. Nothing caught it because CI had no lint step.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
