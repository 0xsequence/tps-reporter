const { Command } = require("commander");
const figlet = require("figlet");
const readline = require("readline-sync");

const program = new Command();

console.log(figlet.textSync("TPS Report"));

program
  .version("1.0.0")
  .description("Run TPS reports against Sequence Relayer")
  .option("-c, --chain  [value]", "Chain to run report on")
  .parse(process.argv);

const privateKey = readline.question("Private key for EOA wallet: ", { hideEchoBack: true });

console.log(privateKey);

const options = program.opts();

if (options.chain) {
    console.log("Selected chain: ", options.chain);
}
