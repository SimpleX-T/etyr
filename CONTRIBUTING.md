# Contributing to Etyr

First off, thanks for taking the time to contribute! Etyr is an open-source browser extension aimed at helping users understand the web seamlessly. We welcome all contributions, including bug reports, feature requests, and code contributions.

## Getting Started

### Prerequisites
- Node.js (v18+)
- `pnpm` package manager (`npm install -g pnpm`)
- A Chromium-based browser (Chrome, Edge, Brave) or Firefox for testing.

### Local Development Setup

1. Fork the repository and clone it to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/etyr.git
   cd etyr
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server (watches for changes and recompiles):
   ```bash
   pnpm run dev
   ```

4. Load the extension in your browser:
   - **Chrome/Edge/Brave:** Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist/` folder inside your cloned repository.
   - **Firefox:** Follow the Firefox instructions in the README.

## How to Contribute

### Submitting Bugs or Feature Requests
Please use the GitHub Issue Tracker to report bugs or request new features. Before opening a new issue, search existing issues to see if it has already been reported.

### Submitting a Pull Request
1. Branch off of the `main` branch: `git checkout -b feature/your-feature-name`.
2. Make your changes and write descriptive commit messages.
3. Ensure your code follows the existing style and conventions. Run `pnpm run lint` and `pnpm run typecheck` to verify.
4. Run tests if applicable: `pnpm test`.
5. Push your branch to your fork: `git push origin feature/your-feature-name`.
6. Open a Pull Request against the `main` branch of the upstream repository.

## Architecture Guidelines
- **Content Script:** Modifies the page DOM only inside the `#etyr-tooltip-root` Shadow DOM to prevent CSS leaks. Do not add global styles.
- **Messaging:** All cross-script communication (Popup <-> Background <-> Content) goes through the typed `sendMessage` utility wrapping `chrome.runtime.sendMessage`.

Thank you for contributing to Etyr!
