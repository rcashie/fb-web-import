# fb-web-import
Utility scripts for importing data into the framebastard website

## Setup

1. Install npm and node. Using [nvm](https://github.com/creationix/nvm#installation) to handle this for you is recommended.

2. Install node modules. From the *root directory* run:
    ```sh
    npm install
    ```

## Building

```sh
npx tsc -p tsconfig.json
```

## Running

Before running any importers create a file named `config.json` in the root directory using the template [config.json.template](config.json.template). Fill out the property values.

### Importers

#### fat-sf5

The input file to this importer can be found [here](https://github.com/D4RKONION/fatsfvframedatajson)
```sh
node ./build/fat-sf5/import.js --file <input file> [--apply]
```
