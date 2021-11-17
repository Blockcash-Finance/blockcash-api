import { getTradingFeeApr } from "../src/utils/getTradingFeeApr";

const { SUSHI_LPF } = require("../src/constants");
import { ubeswapClient } from "../src/apollo/client";
import pools from "../src/data/celo/ubeswapLpPools.json";

async function main() {
  const pairAddresses = pools.map((pool) => pool.address);

  const tradingFeeApr = await getTradingFeeApr(
    ubeswapClient,
    pairAddresses,
    SUSHI_LPF
  );
  console.log("tradingFeeApr", tradingFeeApr);
}

main();
