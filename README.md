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
pnpm install
pnpm start
```

TPS Reporter will ask for the private key of an EOA (Externally Owned Address). Provide the private key and you will be given a corresponding Sequence Wallet address.

Before continuing, ensure that this address has mint permissions on the contract you will be testing with. You can do this in [Sequence Builder](https://sequence.build) by providing minter permission to the address. To do so, navigate to contract details > Settings > Permissions and give Minter permission to the account you were given for your Sequence proxy wallet.

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
pnpm install
pnpm run build
```

If desired, you can now install `tpsreporter` on your system with:

```
pnpm install -g .
```

Now you can access it directly with `tpsreporter`.
