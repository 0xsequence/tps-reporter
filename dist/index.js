"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Command } = require("commander");
const figlet = require("figlet");
const readline = require("readline-sync");
const auth_1 = require("@0xsequence/auth");
const ethers_1 = require("ethers");
const program = new Command();
console.log(figlet.textSync("TPS Report"));
program
    .version("0.1.0")
    .description("Run TPS reports against Sequence Relayer")
    .option("-c, --chain  [value]", "Chain to run report on")
    .parse(process.argv);
const privateKey = readline.question("Private key for EOA wallet: ", { hideEchoBack: true });
const options = program.opts();
if (options.chain) {
    console.log("Selected chain: ", options.chain);
}
start();
async function start() {
    const provider = ethers_1.ethers.getDefaultProvider();
    const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
    const session = await auth_1.Session.singleSigner({
        signer: wallet
    });
    console.log(session.account.address);
    process.exit();
}
//# sourceMappingURL=index.js.map