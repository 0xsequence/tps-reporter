#! /usr/bin/env node

import { performance } from 'perf_hooks';

import { Command } from "commander";
import figlet from "figlet";
import readline from "readline-sync";

import { Session } from '@0xsequence/auth';
import { ChainId, findSupportedNetwork } from '@0xsequence/network';
import { ethers } from 'ethers';
import { sign } from 'crypto';

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
const provider = new ethers.JsonRpcProvider(nodeURL);
const wallet = new ethers.Wallet(privateKey, provider);

const session = await Session.singleSigner({
    signer: wallet as any, // Type assertion needed due to compatibility issues
    projectAccessKey: options.key,
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
    // runParallelTransactionsReport(chainCode, targetAddress, contractAddress, totalTransactionCount);
    runParallelBatchedTransactionsReport(chainCode, targetAddress, contractAddress, totalTransactionCount);
} else {
    runSingleTransactionReport(chainCode, targetAddress, contractAddress);
}

async function runSingleTransactionReport(chainId: ChainId, targetWalletAddress: string, contractAddress: string) {
    console.log(`Running single transaction using ${nodeURL}`);
    
    const erc1155Interface = new ethers.Interface([
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
        
        console.log(`Transaction sent: ${txnResponse.hash}. Waiting for receipt...`);
        const txnReceipt = await txnResponse.wait();
        const txnEndTime = performance.now();
        // console.log(txnResponse);
        // console.log(txnReceipt);
        
        if (!txnReceipt) {
            console.error("Transaction receipt is null");
            return;
        }
        
        const totalTransactionTime = txnEndTime - txnStartTime;
        const gasUsed = txnReceipt.gasUsed || 0n;

        if (txnReceipt.status != 1) {
            console.error(`Transaction failed (status: ${txnReceipt.status}). Hash: ${txnReceipt.hash}`);
        } else {
            console.log(`\n--- Results ---`);
            console.log(`Transaction successful: ${txnReceipt.hash}`);
            console.log(`Latency: ${totalTransactionTime.toFixed(2)}ms (${(totalTransactionTime / 1000).toFixed(2)}s)`);
            console.log(`Gas Used: ${gasUsed.toString()}`);
        }

    } catch (error: any) {
        console.error("Error during single transaction report:", error.message);
        return;
    }
}

// Helper function derived from runSingleTransactionReport
// Executes a single transaction and returns its result
async function executeSingleTransaction(
    chainId: ChainId, 
    targetWalletAddress: string, 
    contractAddress: string,
    session: Session, // Pass the session instead of creating it again
    txIndex: number // Optional index for logging context if needed
): Promise<{ success: boolean; latency: number | null; gasUsed: bigint | null; hash?: string, error?: string }> {

    const erc1155Interface = new ethers.Interface([
        'function mint(address to, uint256 tokenId, uint256 amount, bytes data)'
    ]);
    
    const transactionData = erc1155Interface.encodeFunctionData(
        'mint', [`${targetWalletAddress}`, "1", "1", "0x00"]
    );

    // Use the provided session's signer
    const signer = session.account.getSigner(chainId);
    let txnResponse: ethers.TransactionResponse | null = null; // Keep track of the response for error reporting

    try {
        const txnStartTime = performance.now();
        txnResponse = await signer.sendTransaction({ // Assign response here
            to: contractAddress,
            data: transactionData,
        });
        
        // Optional: Log dispatch if helpful for debugging parallel runs
        // console.log(`Txn ${txIndex + 1} dispatched: ${txnResponse.hash}`); 

        const txnReceipt = await txnResponse.wait();
        const txnEndTime = performance.now();
        
        if (!txnReceipt) {
             return {
                success: false,
                latency: null,
                gasUsed: null,
                hash: txnResponse?.hash, // Include hash if available
                error: "Transaction receipt was null"
            };
        }
        
        const totalTransactionTime = txnEndTime - txnStartTime;
        const gasUsed = txnReceipt.gasUsed || 0n;

        if (txnReceipt.status != 1) {
             return {
                success: false,
                latency: totalTransactionTime,
                gasUsed: gasUsed,
                hash: txnReceipt.hash,
                error: `Transaction failed (status: ${txnReceipt.status})`
            };
        } else {
            // Transaction successful
            return {
                success: true,
                latency: totalTransactionTime,
                gasUsed: gasUsed,
                hash: txnReceipt.hash,
                error: undefined
            };
        }

    } catch (error: any) {
        // console.error(`Error during txn ${txIndex + 1} execution: ${error.message}`);
        return {
            success: false,
            latency: null,
            gasUsed: null,
            hash: txnResponse?.hash, // Include hash if available from response
            error: error.message || "Unknown execution error"
        };
    }
    // NOTE: No process.exit() here
}

async function runParallelTransactionsReport(chainId: ChainId, targetWalletAddress: string, contractAddress: string, totalTransactions: number) {
    console.log(`Running ${totalTransactions} transactions in parallel using ${nodeURL}`);

    const erc1155Interface = new ethers.Interface([
        'function mint(address to, uint256 tokenId, uint256 amount, bytes data)'
    ]);

    const transactionData = erc1155Interface.encodeFunctionData(
        'mint', [`${targetWalletAddress}`, "1", "1", "0x00"]
    );

    // Store promises and start times
    let transactionPromises: { 
        promise: Promise<ethers.TransactionResponse | null>; 
        startTime: number 
    }[] = [];
    const overallStartTime = performance.now();

    for (let index = 0; index < totalTransactions; index++) {
        const nonceSpace = ethers.toBigInt(ethers.hexlify(ethers.randomBytes(20)));
        const signer = session.account.getSigner(chainId, {
            nonceSpace: nonceSpace,
        });

        const transaction = {
            to: contractAddress,
            data: transactionData,
        };

        const startTime = performance.now();
        // Wrap sendTransaction in an error handler
        const promise = signer.sendTransaction(transaction).catch(err => {
            console.error(`Error sending transaction ${index + 1}:`, err.message);
            return null; // Return null on error
        });
        transactionPromises.push({ promise, startTime });
    }

    try {
        console.log("Sending transactions...");
        // Wait for all transactions to be sent
        const sentTransactions = await Promise.all(transactionPromises.map(tp => tp.promise));
        
        console.log("Waiting for receipts...");
        const receiptPromises = sentTransactions.map(async (txResponse, index) => {
            if (!txResponse) return null; // Skip if sending failed
            try {
                const receipt = await txResponse.wait();
                const endTime = performance.now();
                return { 
                    receipt, 
                    startTime: transactionPromises[index].startTime, 
                    endTime 
                };
            } catch (err) {
                console.error(`Error waiting for receipt ${index + 1} (hash: ${txResponse.hash}):`, err.message);
                return null; // Return null on error
            }
        });

        const results = await Promise.all(receiptPromises);
        const overallEndTime = performance.now();

        const successfulResults = results.filter(r => r !== null && r.receipt?.status === 1) as { 
            receipt: ethers.TransactionReceipt; 
            startTime: number; 
            endTime: number 
        }[];
        const failedResults = results.filter(r => r === null || r.receipt?.status !== 1);
        
        if (successfulResults.length === 0) {
            console.error("No transactions succeeded.");
            return;
        }

        console.log(`\n--- Results ---`);
        console.log(`Total attempted: ${totalTransactions}`);
        console.log(`Successful: ${successfulResults.length}`);
        console.log(`Failed: ${failedResults.length}`);

        const latencies = successfulResults.map(r => r.endTime - r.startTime);
        latencies.sort((a, b) => a - b);

        const totalGasUsed = successfulResults.reduce((sum, r) => sum + (r.receipt.gasUsed || 0n), 0n);
        const totalTimeMs = overallEndTime - overallStartTime;
        const totalTimeSec = totalTimeMs / 1000;

        // P99 Latency
        const p99Index = Math.floor(latencies.length * 0.99) -1;
        const p99LatencyMs = latencies[p99Index >= 0 ? p99Index : 0]; // Handle cases with few txns

        // TPS
        const tps = successfulResults.length / totalTimeSec;

        // GPS
        const gps = totalTimeSec > 0 ? Number(totalGasUsed) / totalTimeSec : 0; // Avoid division by zero

        // Average Gas
        const avgGasUsed = Number(totalGasUsed) / successfulResults.length;


        console.log(`\n--- Performance Metrics ---`);
        console.log(`Total Time: ${totalTimeMs.toFixed(2)}ms (${totalTimeSec.toFixed(2)}s)`);
        console.log(`P99 Latency: ${p99LatencyMs.toFixed(2)}ms (${(p99LatencyMs / 1000).toFixed(2)}s)`);
        console.log(`Transactions Per Second (TPS): ${tps.toFixed(2)}`);
        console.log(`Gas Per Second (GPS): ${gps.toFixed(0)}`);
        console.log(`Average Gas Used per Txn: ${avgGasUsed.toFixed(0)}`);

    } catch (error) {
        console.error("An unexpected error occurred during parallel report:", error);
    } finally {
        process.exit();
    }
}

// New function to run multiple single transactions in parallel
async function runParallelBatchedTransactionsReport(chainId: ChainId, targetWalletAddress: string, contractAddress: string, totalTransactions: number) {
    console.log(`Running ${totalTransactions} batched single transactions in parallel using ${nodeURL}`);

    let transactionPromises: Promise<{ success: boolean; latency: number | null; gasUsed: bigint | null; hash?: string, error?: string }>[] = [];
    const overallStartTime = performance.now();

    console.log("Dispatching transactions...");
    for (let index = 0; index < totalTransactions; index++) {
        // We pass the existing session, chainId, addresses, and index
        const promise = executeSingleTransaction(
            chainId, 
            targetWalletAddress, 
            contractAddress, 
            session, // Use the globally defined session
            index
        );
        transactionPromises.push(promise);
    }

    try {
        // Wait for all individual transaction executions to complete
        const results = await Promise.all(transactionPromises);
        const overallEndTime = performance.now();

        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        if (successfulResults.length === 0) {
            console.error("No transactions succeeded.");
            failedResults.forEach((r, i) => console.error(`Failure ${i + 1}: Hash: ${r.hash || 'N/A'}, Error: ${r.error || 'Unknown'}`));
            return; // Exit function, process will be terminated in finally block
        }

        console.log(`\n--- Results ---`);
        console.log(`Total attempted: ${totalTransactions}`);
        console.log(`Successful: ${successfulResults.length}`);
        console.log(`Failed: ${failedResults.length}`);
        if (failedResults.length > 0) {
             console.warn("Failed transaction details:");
             failedResults.forEach((r, i) => console.warn(`  Failure ${i + 1}: Hash: ${r.hash || 'N/A'}, Error: ${r.error || 'Unknown'}`));
        }

        console.log(`\n--- Individual Transaction Details (Successful) ---`);
        successfulResults.forEach((r, i) => {
            const latencyMs = r.latency || 0; // Should always have latency if successful
            const gas = r.gasUsed || 0n;
            console.log(`  Txn ${i + 1}: Hash: ${r.hash}, Latency: ${latencyMs.toFixed(2)}ms, Gas Used: ${gas.toString()}`);
        });


        // Filter out null latencies (which shouldn't happen for successful txns, but belts and suspenders)
        const latencies = successfulResults.map(r => r.latency).filter(l => l !== null) as number[];
        latencies.sort((a, b) => a - b);

        const totalGasUsed = successfulResults.reduce((sum, r) => sum + (r.gasUsed || 0n), 0n);
        const totalTimeMs = overallEndTime - overallStartTime;
        const totalTimeSec = totalTimeMs / 1000;

        // P99 Latency
        let p99LatencyMs = 0;
        if (latencies.length > 0) {
            const p99Index = Math.max(0, Math.floor(latencies.length * 0.99) - 1); // Ensure index is not negative
             p99LatencyMs = latencies[p99Index];
        }
       

        // TPS (based on successful transactions over total time)
        const tps = successfulResults.length / totalTimeSec;

        // GPS (based on successful transactions over total time)
        const gps = totalTimeSec > 0 ? Number(totalGasUsed) / totalTimeSec : 0; // Avoid division by zero

        // Average Gas
        const avgGasUsed = successfulResults.length > 0 ? Number(totalGasUsed) / successfulResults.length : 0;


        console.log(`\n--- Performance Metrics ---`);
        console.log(`Total Time: ${totalTimeMs.toFixed(2)}ms (${totalTimeSec.toFixed(2)}s)`);
         if (latencies.length > 0) {
            console.log(`P99 Latency (Successful): ${p99LatencyMs.toFixed(2)}ms (${(p99LatencyMs / 1000).toFixed(2)}s)`);
        } else {
             console.log(`P99 Latency (Successful): N/A (no successful transactions)`);
        }
        console.log(`Transactions Per Second (TPS): ${tps.toFixed(2)}`);
        console.log(`Gas Per Second (GPS): ${gps.toFixed(0)}`);
        console.log(`Average Gas Used per Successful Txn: ${avgGasUsed.toFixed(0)}`);

    } catch (error) {
        // This catch block might be less likely to hit if executeSingleTransaction handles its errors,
        // but good to have for Promise.all or other unexpected issues.
        console.error("An unexpected error occurred during the batched parallel report:", error);
    } finally {
        process.exit(); // Ensure the process exits after reporting
    }
}
