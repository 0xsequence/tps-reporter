#! /usr/bin/env node

import { performance } from 'perf_hooks';

import { Command } from "commander";
import figlet from "figlet";
import readline from "readline-sync";

import { Session } from '@0xsequence/auth';
import { ChainId, findSupportedNetwork } from '@0xsequence/network';
import { ethers } from 'ethers';

const program = new Command();

console.log(figlet.textSync("TPS Reporter"));

program
  .version("0.1.0")
  .description("Run TPS analysis against Sequence Relayer")
  .option("-c, --chain  [value]", "Chain to run report on (mainnet, polygon, polygon-zkevm, arbitrum, arbitrum-nova, optimism, bsc, avalanche, base)", "arbitrum")
  .option("-n, --txns  [value]", "How many transactions to run", "1")
  .option("-t, --target  [value]", "Target wallet address that mints should be sent to")
  .option("-k, --key  [value]", "Sequence Builder project access key")
  .option("-a, --contract  [value]", "ERC1155 contract address to target")
  .option("-p, --private  [value]", "Private key for EOA wallet")
  .parse(process.argv);

const options = program.opts();

let privateKey = "";
let contractAddress = "";
let targetAddress = "";

if (options.private) {
    privateKey = options.private;
} else {
    privateKey = readline.question("Private key for EOA wallet: ", { hideEchoBack: true });
}

const chainConfig = findSupportedNetwork(options.chain);

if (chainConfig === undefined) {
    console.error("Unsupported network");
    process.exit();
}

console.log("Selected chain: ", chainConfig.name);

let nodeURL = chainConfig.rpcUrl;

if (options.key) {
    nodeURL += "/" + options.key;
}

const chainCode = chainConfig.chainId;
const provider = new ethers.providers.JsonRpcProvider(nodeURL);
const wallet = new ethers.Wallet(privateKey, provider);

const session = await Session.singleSigner({
    signer: wallet
});

console.log(`Using wallet: ${session.account.address}`);
console.warn("Ensure this wallet has mint permissions on the provided contract");

if (options.contract) {
    contractAddress = options.contract;
} else {
    contractAddress = readline.question("Address for ERC1155 contract: ", {});
}

if (options.target) {
    targetAddress = options.target;
} else {
    targetAddress = session.account.address;
}

const totalTransactionCount = Number(options.txns);

if (totalTransactionCount > 1) {
    runParallelTransactionsReport(chainCode, targetAddress, contractAddress, totalTransactionCount);
} else {
    runSingleTransactionReport(chainCode, targetAddress, contractAddress);
}

async function runSingleTransactionReport(chainId: ChainId, targetWalletAddress: string, contractAddress: string) {
    console.log(`Running single transaction using ${nodeURL}`);
    
    const erc1155Interface = new ethers.utils.Interface([
        'function mint(address to, uint256 tokenId, uint256 amount, bytes data)'
    ]);
    
    const transactionData = erc1155Interface.encodeFunctionData(
        'mint', [`${targetWalletAddress}`, "1", "1", "0x00"]
    );

    const signer = session.account.getSigner(chainId);

    try {
        const txnStartTime = performance.now();
        const txnResponse = await signer.sendTransaction({
            to: contractAddress,
            data: transactionData,
        });

        const txnReceipt = await txnResponse.wait();
        const txnEndTime = performance.now();

        if (txnReceipt.status != 1) {
            console.error(`Unexpected status: ${txnReceipt.status}`);
        } else {
            console.log(`Transaction completed: ${txnReceipt.transactionHash}`);
        }

        let totalTransactionTime = txnEndTime - txnStartTime;
    
        console.log(`Transaction time: ${totalTransactionTime}ms (${totalTransactionTime/1000}s)`);
    } catch (error) {
        console.error(error);
        return;
    } finally {
        process.exit()
    }
}

async function runParallelTransactionsReport(chainId: ChainId, targetWalletAddress: string, contractAddress: string, totalTransactions: number) {
    console.log(`Running ${totalTransactions} transactions using ${nodeURL}`);

    const provider = new ethers.providers.JsonRpcProvider(nodeURL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const session = await Session.singleSigner({
        signer: wallet
    });

    console.log(`Using wallet: ${session.account.address}`);
    
    const erc1155Interface = new ethers.utils.Interface([
        'function mint(address to, uint256 tokenId, uint256 amount, bytes data)'
    ]);
    
    const transactionData = erc1155Interface.encodeFunctionData(
        'mint', [`${targetWalletAddress}`, "1", "1", "0x00"]
    );

    let transactions: Promise<ethers.providers.TransactionResponse>[] = [];

    for (let index = 0; index < totalTransactions; index++) {
        const nonceSpace = ethers.BigNumber.from(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
        const signer = session.account.getSigner(chainId, {
            nonceSpace: nonceSpace,
        });

        const transaction = {
            to: contractAddress,
            data: transactionData,
        };

        transactions.push(signer.sendTransaction(transaction));
    }

    try {
        const txnStartTime = performance.now();
        await Promise.all(transactions);
        const txnEndTime = performance.now();

        let totalTransactionTime = txnEndTime - txnStartTime;
        let averageTransactionTime = totalTransactionTime / totalTransactions;

        console.log(`Total transaction time: ${totalTransactionTime}ms (${totalTransactionTime/1000}s)`);
        console.log(`Average transaction time: ${averageTransactionTime}ms (${averageTransactionTime/1000}s)`);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit()
    }
}
