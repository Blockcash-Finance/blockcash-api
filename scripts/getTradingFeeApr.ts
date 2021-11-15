import { getTradingFeeAprSushi as getTradingFeeApr } from "../src/utils/getTradingFeeApr";

const { SUSHI_LPF } = require("../src/constants");
import { sushiCeloClient as sushiClient } from "../src/apollo/client";
import pools from "../src/data/celo/sushiLpPools.json";

async function main() {
  const pairAddresses = pools.map((pool) => pool.address);

  const tradingFeeApr = await getTradingFeeApr(
    sushiClient,
    pairAddresses,
    SUSHI_LPF
  );
  console.log("tradingFeeApr", tradingFeeApr);
}

main();
