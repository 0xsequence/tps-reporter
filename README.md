# TPS Reporter

CLI for running throughput analysis against Sequence Relayer on all supported chains.

## Quickstart

```
npm install
npm start
```

TPS Reporter will ask for the private key of an EOA (Externally Owned Address). Provide the private key and you will be given a corresponding Sequence Wallet address.

Before continuing, ensure that this address has mint permissions on the contract you will be testing with. You can do this in Sequence Builder by providing minter permission to the address. To do so, navigate to contract details > Write Contract and expand the `grantRole` method. Fill with the following details:

- role: `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
- account: Address you were given for the Sequence Wallet

Once the address has the necessary permissions, continue to provide the contract address.

TPS reporter will now attempt to run the number of mint operations that you provided in parallel and will report the average transaction relay time.
