import { celoWeb3 } from "../../../utils/web3";
import { CELO_CHAIN_ID } from "../../../constants";

import { getUbeswapApys } from "../common/getUbeswapApys";
import { ubeswapClient } from "../../../apollo/client";

import pools from "../../../data/celo/ubeswapLpPools.json";

import { addressBook } from "../../../../packages/address-book/address-book";
const {
  celo: {
    platforms: {
      ubeswapCelo: { poolManager },
    },
    tokens: { UBE, CELO },
  },
} = addressBook;

export const getUbeswapCeloApys = () => {
  return getUbeswapApys({
    poolManager,
    sushiOracleId: UBE.symbol,
    nativeOracleId: CELO.symbol,
    nativeTotalAllocPoint: 9600,
    pools,
    ubeswapClient,
    web3: celoWeb3,
    chainId: CELO_CHAIN_ID,
  });
};
