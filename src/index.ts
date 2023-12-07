import { Command } from "commander";
import figlet from "figlet";
import readline from "readline-sync";

import { Session } from '@0xsequence/auth';
import { ethers } from 'ethers';

const program = new Command();

console.log(figlet.textSync("TPS Reporter"));

program
  .version("0.1.0")
  .description("Run TPS analysis against Sequence Relayer")
  .option("-c, --chain  [value]", "Chain to run report on")
  .parse(process.argv);

const privateKey = readline.question("Private key for EOA wallet: ", { hideEchoBack: true });
const options = program.opts();

if (options.chain) {
    console.log("Selected chain: ", options.chain);
}

start()

async function start() {
    const provider = ethers.getDefaultProvider();
    const wallet = new ethers.Wallet(privateKey, provider);

    const session = await Session.singleSigner({
        signer: wallet
    });

    console.log(session.account.address);

    process.exit()
}
