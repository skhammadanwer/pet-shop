# Pet Shop Truffle Box

This box has all you need to get started with our [Pet Shop tutorial](http://truffleframework.com/tutorials/pet-shop).

## Working together

Shared repo: https://github.com/skhammadanwer/pet-shop

`main` should always stay runnable. Each person works on one feature in their own branch, then opens a pull request into `main`.

Clone:

```bash
git clone https://github.com/skhammadanwer/pet-shop.git
cd pet-shop
```

Start a feature branch from the latest `main`:

```bash
git checkout main
git pull
git checkout -b feature/your-feature-name
```

Push the branch and open a pull request. After it is merged, everyone else should `git pull` on `main` before continuing.

To push branches to this repo (not only fork), ask to be added as a collaborator with Write access.

## How to run

Step-by-step setup (Ganache, migrate --reset, MetaMask) is in [HOW_TO_RUN.txt](HOW_TO_RUN.txt). Do not share Ganache database files; recreate demo state locally with `truffle migrate --reset`.

## Installation

1. Install Truffle globally.
    ```javascript
    npm install -g truffle
    ```

2. Download the box. This also takes care of installing the necessary dependencies.
    ```javascript
    truffle unbox pet-shop
    ```

3. Run the development console.
    ```javascript
    truffle develop
    ```

4. Compile and migrate the smart contracts. Note inside the development console we don't preface commands with `truffle`.
    ```javascript
    compile
    migrate
    ```

5. Run the `liteserver` development server (outside the development console) for front-end hot reloading. Smart contract changes must be manually recompiled and migrated.
    ```javascript
    // Serves the front-end on http://localhost:3000
    npm run dev
    ```

**NOTE**: This box is not a complete dapp, but the starting point for the [Pet Shop tutorial](http://truffleframework.com/tutorials/pet-shop). You'll need to complete that for this to function.

## FAQ

* __How do I use this with the EthereumJS TestRPC?__

    It's as easy as modifying the config file! [Check out our documentation on adding network configurations](http://truffleframework.com/docs/advanced/configuration#networks). Depending on the port you're using, you'll also need to update line 16 of `src/js/app.js`.
