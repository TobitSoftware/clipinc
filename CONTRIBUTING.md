# Contributing

-   [Local Development](#-local-development)
-   [Fixing Common Bugs](#-fixing-common-bugs)
-   [Publishing a New Release](#-publishing-a-new-release)

## ❯ Local Development

There are a few steps involved to build the extension from source and test it in
your browser:

1. Clone the repository
2. Install dependencies by running `npm i`
3. Build a development version by running `npm run dev-build`
4. Open `chrome://extensions` in your Chromium-based browser
5. Activate developer mode on the extensions page
6. Load the `dist/` directory from the repository folder as an unpacked
   extension

To pick up any subsequent changes you make to the code rerun the
`npm run dev-build` command and reload the extension.

## ❯ Fixing Common Bugs

Every so often the extension will just stop working. This is mostly due to
Spotify changing the layout of their website or changing the attributes on their
HTML elements.

These issues are usually easy to fix. You should use the above instructions to
get a local version running and then read the error message in the developer
console of your browser.

It probably says something like _Cannot read property '...' of null_. Below the
error message there will be the stacktrace. Check out which method caused the
error and see if the call to `document.querySelector` in there still works.

Update the selector if needed.

## ❯ Publishing a New Release

To publish a new release you have to follow a few steps:

1.  **Increase the version**

    Run `npm version patch` to increase the version in your package.json file
    and copy the new version to the `version` field in `manifest.json`.

2.  **Create the extension bundle**

    Run the `npm run build` command to generate an `update.zip` file in the root
    directory.

3.  **Upload the new bundle**

    Now upload the new bundle to the
    [Chrome Web Store](https://chrome.google.com/webstore/category/extensions?hl=de)
    and the
    [Microsoft Edge-Add-Ons Store](https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview)

The update will then be reviewed and be available within a few hours.
