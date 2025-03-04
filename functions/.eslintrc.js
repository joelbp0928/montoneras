module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "comma-spacing": ["error", { before: false, after: true }],
    "object-curly-spacing": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "max-len": ["error", { code: 120 }],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {
        "max-len": ["error", { "code": 120 }],
      },
    },
  ],
  globals: {},
};
