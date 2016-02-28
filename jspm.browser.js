SystemJS.config({
  paths: {
    "github:*": "jspm_packages/github/*",
    "lib:*": "lib/*",
    "npm:*": "jspm_packages/npm/*",
    "lib:crypto": "lib/crypto.js",
    "lib:rsa": "lib/rsa.js"
  },
  bundles: {
    "dist/oidc-client.bundled.js": [
      "github:frankwallis/plugin-typescript@4.0.1.json",
      "npm:systemjs-plugin-babel@0.0.6.json",
      "npm:systemjs-plugin-babel@0.0.6/babel-helpers/classCallCheck.js",
      "npm:systemjs-plugin-babel@0.0.6/babel-helpers/createClass.js",
      "src/DefaultHttpRequest.ts",
      "src/OidcClient.ts",
      "src/Utils.ts",
      "src/index.ts"
    ]
  }
});
