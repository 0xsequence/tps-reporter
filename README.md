```
  _____ ____  ____    ____                       _            
 |_   _|  _ \/ ___|  |  _ \ ___ _ __   ___  _ __| |_ ___ _ __ 
   | | | |_) \___ \  | |_) / _ \ '_ \ / _ \| '__| __/ _ \ '__|
   | | |  __/ ___) | |  _ <  __/ |_) | (_) | |  | ||  __/ |   
   |_| |_|   |____/  |_| \_\___| .__/ \___/|_|   \__\___|_|   
                               |_|                            
```

CLI for running throughput analysis against Sequence Relayer on all supported chains.

## Quickstart

```
npm install
npm start
```

TPS Reporter will ask for the private key of an EOA (Externally Owned Address). Provide the private key and you will be given a corresponding Sequence Wallet address.

Before continuing, ensure that this address has mint permissions on the contract you will be testing with. You can do this in Sequence Builder by providing minter permission to the address. To do so, navigate to contract details > Write Contract and expand the `grantRole` method. Fill with the following details:

- `role`: `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
- `account`: Address you were given for the Sequence Wallet

Once the account has the necessary permissions, continue to provide the ERC1155 contract address to mint with.

TPS reporter will now attempt to run the number of mint operations that you provided in parallel and will report the average transaction relay time.

If you are running a large number of transactions, make sure to use the `--key` flag to provide a project access key for [Sequence Builder](https://sequence.build/). Otherwise report will fail due to rate limiting.

## Options

Following options are available as CLI flags:

- `-c` `--chain` Chain to run report on (mainnet, polygon, polygon-zkevm, arbitrum, arbitrum-nova, optimism, bsc, avalanche, base)
- `-n` `--txns` How many transactions to run
- `-t` `--target` Target wallet address that mints should be sent to
- `-k` `--key` Sequence Builder project access key
- `-a` `--contract` ERC1155 contract address to target
- `-p` `--private` Private key for EOA wallet


## Installation

```
npm install
npm run build
```

If desired, you can now install `tpsreporter` on your system with:

```
npm install -g .
```

Now you can access it directly with `tpsreporter`.
