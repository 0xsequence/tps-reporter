import { Command } from "commander";
import figlet from "figlet";
import readline from "readline-sync";

import { Session } from '@0xsequence/auth';
import { ChainId } from '@0xsequence/network';
import { ethers } from 'ethers';

const program = new Command();

console.log(figlet.textSync("TPS Reporter"));

program
  .version("0.1.0")
  .description("Run TPS analysis against Sequence Relayer")
  .option("-c, --chain  [value]", "Chain to run report on (mainnet, polygon, polygon-zkevm, arbitrum, arbitrum-nova, optimism, bsc, avalanche, base)")
  .option("-t, --target  [value]", "Target wallet address that mints should be sent to")
  .parse(process.argv);

const privateKey = readline.question("Private key for EOA wallet: ", { hideEchoBack: true });
const options = program.opts();

const BUILDER_ACCESS_KEY = "4o2Uh6qbfGICYVnQBMPW8MlAAAAAAAAAA"
const CONTRACT_ADDRESSES = {
    ETHEREUM: "",
    ARBITRUM: "0x5f87ca3003ec99ff76ec34c2837bc87178abfdeb",
    POLYGON: "",
}

let contractAddress = CONTRACT_ADDRESSES.ARBITRUM;
let targetAddress = "0xa2A7cD4302836767D194e2321E34B834494e0a28";

if (options.target) {
    targetAddress = options.target;
}

let chainCode = ChainId.ARBITRUM;

if (options.chain) {
    switch (options.chain) {
        case "mainnet":
            chainCode = ChainId.MAINNET;
            break;
        case "polygon":
            chainCode = ChainId.POLYGON;
            contractAddress = CONTRACT_ADDRESSES.POLYGON;
            break;
        case "polygon-zkevm":
            chainCode = ChainId.POLYGON_ZKEVM;
            break;
        case "arbitrum":
            chainCode = ChainId.ARBITRUM;
            contractAddress = CONTRACT_ADDRESSES.ARBITRUM;
            break;
        case "arbitrum-nova":
            chainCode = ChainId.ARBITRUM_NOVA;
            break;
        case "optimism":
            chainCode = ChainId.OPTIMISM;
            break;
        case "bsc":
            chainCode = ChainId.BSC;
            break;
        case "avalanche":
            chainCode = ChainId.AVALANCHE;
            break;
        case "base":
            chainCode = ChainId.BASE;
            break;
        default:
            break;
    }

    console.log("Selected chain: ", options.chain);
}

runReport(chainCode, targetAddress, contractAddress)

async function runReport(chainId: ChainId, targetWalletAddress: string, contractAddress: string) {
    const provider = ethers.getDefaultProvider();
    const wallet = new ethers.Wallet(privateKey, provider);

    const session = await Session.singleSigner({
        signer: wallet
    });

    console.log(session.account.address);

    const signer = session.account.getSigner(chainId);
    
    const erc1155Interface = new ethers.utils.Interface([
        'function mint(address to, uint256 tokenId, uint256 amount, bytes data)'
    ]);

    console.log("Interface: ", erc1155Interface);
    
    const data = erc1155Interface.encodeFunctionData(
        'mint', [`${targetWalletAddress}`, "1", "1", "0x00"]
    );
    
    console.log("Data: ", data);
    
    const transaction = {
        to: contractAddress,
        data: data
    }
    console.log(transaction);

    try {
        const txnResponse = await signer.sendTransaction(transaction);
        const txnReceipt = await txnResponse.wait();

        if (txnReceipt.status != 1) {
            console.error(`Unexpected status: ${txnReceipt.status}`);
        } else {
            console.log(`Transaction completed: ${txnReceipt.transactionHash}`);
        }    
    } catch (error) {
        console.error(error);
        return;
    } finally {
        process.exit()
    }
}
