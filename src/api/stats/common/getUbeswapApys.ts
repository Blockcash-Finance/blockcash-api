import BigNumber from "bignumber.js";
import Web3 from "web3";
import { MultiCall } from "eth-multicall";
import { multicallAddress } from "../../../utils/web3";
import { ChainId } from "../../../../packages/address-book/types/chainid";

import fetchPrice from "../../../utils/fetchPrice";
import { getApyBreakdown } from "./getApyBreakdown";
import { LpPool } from "../../../types/LpPool";

// trading apr
import { SUSHI_LPF } from "../../../constants";
import { getTradingFeeApr } from "../../../utils/getTradingFeeApr";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";

// abis
import PoolManager from "../../../abis/ubeswap/pool-manager.json";
import StakingRewards from "../../../abis/ubeswap/StakingRewards.json";
import ERC20 from "../../../abis/common/ERC20/ERC20.json";

// const sushiOracleId = "SUSHI";
const oracle = "tokens";
const DECIMALS = "1e18";
const secondsPerBlock = 1;
const secondsPerYear = 31536000;
export const BIG_INT_SECONDS_IN_WEEK = new BigNumber(60 * 60 * 24 * 7);
export const BIG_INT_SECONDS_IN_YEAR = new BigNumber(60 * 60 * 24 * 365);

interface UbeswapApyParams {
  poolManager: string; // address
  sushiOracleId: string; // i.e. SUSHI
  nativeOracleId: string; // i.e. WMATIC
  // totalAllocPoint is non public
  // https://github.com/sushiswap/sushiswap/blob/37026f3749f9dcdae89891f168d63667845576a7/contracts/mocks/ComplexRewarderTime.sol#L44
  // need to pass in same hardcoded value found here:
  // https://github.com/sushiswap/sushiswap-interface/blob/6300093e17756038a5b5089282d7bbe6dce87759/src/hooks/minichefv2/useFarms.ts#L77
  nativeTotalAllocPoint: number;
  pools: LpPool[];
  ubeswapClient: ApolloClient<NormalizedCacheObject>;
  web3: Web3;
  chainId: ChainId;
}

export const getUbeswapApys = async (params: UbeswapApyParams) => {
  const { pools, ubeswapClient } = params;
  // const pairAddresses = pools.filter(
  //   (pool) => pool.address !== undefined || pool.address !== ""
  // );
  // console.log("pairAddresses", pairAddresses);
  const pairAddresses = pools.map((pool) => pool.address);
  const tradingAprs = await getTradingFeeApr(
    ubeswapClient,
    pairAddresses,
    SUSHI_LPF
  );
  console.log("tradingAprs", tradingAprs);
  const farmApys = await getFarmApys(params);
  return getApyBreakdown(pools, tradingAprs, farmApys, SUSHI_LPF);
  // return farmApys;
};

const getFarmApys = async (params: UbeswapApyParams) => {
  const {
    web3,
    pools,
    poolManager,
    nativeOracleId,
    nativeTotalAllocPoint,
    sushiOracleId,
    chainId,
  } = params;
  const apys = [];
  // const poolManagerContract = new web3.eth.Contract(
  //   PoolManager as any,
  //   poolManager
  // );

  // const tokenPrice = await fetchPrice({ oracle, id: sushiOracleId });
  // const nativePrice = await fetchPrice({ oracle, id: nativeOracleId });

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    console.log("pool", pool.name);
    const apy = await getRewardsPerYear(web3, chainId, pool);
    apys.push(apy);
  }
  return apys;
};
const getRewardsPerYear = async (web3, chainId, pool: LpPool) => {
  let totalStakedInUsdMin = new BigNumber(0);

  let rewardPerSecondCalls = [];
  let balanceCalls = [];
  pool.stakingReward.forEach((reward) => {
    const stakingReward = new web3.eth.Contract(
      StakingRewards as any,
      reward.address
    );

    balanceCalls.push({
      balance: stakingReward.methods.totalSupply(),
    });
    rewardPerSecondCalls.push({
      rewardPerSecond: stakingReward.methods.rewardRate(),
    });
  });

  const multicall = new MultiCall(web3 as any, multicallAddress(chainId));
  const res = await multicall.all([balanceCalls, rewardPerSecondCalls]);

  const balances = res[0].map((v) => new BigNumber(v.balance));
  const rewardPerSeconds = res[1].map((v) => new BigNumber(v.rewardPerSecond));

  const balance = balances[0];
  const lpPrice = await fetchPrice({ oracle: "lps", id: pool.name });
  const totalStakedInUsd = balance.times(lpPrice).dividedBy("1e18");

  let yearlyRewardsTotalInUsd = new BigNumber(0);
  for (let i = 0; i < rewardPerSeconds.length; i++) {
    const rewardPerSecond = rewardPerSeconds[i];
    const tokenPrice = await fetchPrice({
      oracle,
      id: pool?.stakingReward[i].rewardTokenSymbol,
    });
    const yearlyRewards = rewardPerSecond?.times(BIG_INT_SECONDS_IN_YEAR);
    const yearlyRewardsInUsd = yearlyRewards
      .times(tokenPrice)
      .dividedBy(DECIMALS);
    yearlyRewardsTotalInUsd = yearlyRewardsInUsd.plus(yearlyRewardsTotalInUsd);
  }

  return yearlyRewardsTotalInUsd.dividedBy(totalStakedInUsd);
};
