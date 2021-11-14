import {
  getAmmLpPrices,
  getAmmTokensPrices,
} from "../src/api/stats/getAmmPrices";
// const { MULTICHAIN_RPC } = require("../src/constants");

async function main() {
  const ammLpPrices = await getAmmLpPrices();
  const ammTokensPrices = await getAmmTokensPrices();
  console.log("ammLpPrices", ammLpPrices);
  console.log("ammTokensPrices", ammTokensPrices);
}

main();
