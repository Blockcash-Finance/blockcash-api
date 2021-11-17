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
import { getTradingFeeAprSushi as getTradingFeeApr } from "../../../utils/getTradingFeeApr";
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
  sushiClient: ApolloClient<NormalizedCacheObject>;
  web3: Web3;
  chainId: ChainId;
}

export const getUbeswapApys = async (params: UbeswapApyParams) => {
  const { pools, sushiClient } = params;
  // const pairAddresses = pools.filter(
  //   (pool) => pool.address !== undefined || pool.address !== ""
  // );
  // console.log("pairAddresses", pairAddresses);
  /* const tradingAprs = await getTradingFeeApr(
    sushiClient,
    pairAddresses,
    SUSHI_LPF
  ); */
  const farmApys = await getFarmApys(params);
  console.log("farmApys", farmApys);

  // return getApyBreakdown(pools, /*tradingAprs,*/ farmApys, SUSHI_LPF);
  return farmApys;
};

const getFarmApys = async (params: UbeswapApyParams) => {
  const {
    web3,
    pools,
    poolManager,
    nativeOracleId,
    nativeTotalAllocPoint,
    sushiOracleId,
  } = params;
  const apys = [];
  const poolManagerContract = new web3.eth.Contract(
    PoolManager as any,
    poolManager
  );
  // const sushiPerSecond = new BigNumber(
  //   await minichefContract.methods.sushiPerSecond().call()
  // );

  const tokenPrice = await fetchPrice({ oracle, id: sushiOracleId });
  const nativePrice = await fetchPrice({ oracle, id: nativeOracleId });
  // const { balances, allocPoints, rewardAllocPoints } = await getPoolsData(
  //   params
  // );

  console.log("tokenPrice", tokenPrice.toString());
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    console.log("pool", pool.name);

    const poolInfo = await poolManagerContract.methods
      .pools(pool.address)
      .call();

    console.log("pool Address", poolInfo.poolAddress);

    const stakingReward = new web3.eth.Contract(
      StakingRewards as any,
      poolInfo.poolAddress
    );

    const rewardPerSecond = new BigNumber(
      await stakingReward.methods.rewardRate().call()
    );

    const balance = new BigNumber(
      await stakingReward.methods.totalSupply().call()
    );

    console.log("balance", balance.toString());

    const perWeek = rewardPerSecond
      ?.times(BIG_INT_SECONDS_IN_WEEK)
      ?.dividedBy("1e18")
      ?.toFormat();

    const yearlyRewards = rewardPerSecond?.times(BIG_INT_SECONDS_IN_YEAR);

    console.log("rewardPerSecond", rewardPerSecond.toString());
    console.log("perWeek", perWeek);

    const lpPrice = await fetchPrice({ oracle: "lps", id: pool.name });
    const totalStakedInUsd = balance.times(lpPrice).dividedBy("1e18");

    console.log("totalStakedInUsd", totalStakedInUsd.toString());

    const yearlyRewardsInUsd = yearlyRewards
      .times(tokenPrice)
      .dividedBy(DECIMALS);

    console.log("yearlyRewardsInUsd", yearlyRewardsInUsd.toString());

    const apy = yearlyRewardsInUsd.dividedBy(totalStakedInUsd);
    apys.push(apy);

    console.log("apy", apy.toString());
    console.log("====================");
  }
  return apys;
};

/*
const getPoolsData = async (params: UbeswapApyParams) => {
  const { web3, pools, minichef, complexRewarderTime, chainId } = params;
  const minichefContract = new web3.eth.Contract(
    SushiMiniChefV2 as any,
    minichef
  );
  const rewardContract = new web3.eth.Contract(
    SushiComplexRewarderTime as any,
    complexRewarderTime
  );

  const balanceCalls = [];
  const allocPointCalls = [];
  const rewardAllocPointCalls = [];
  pools.forEach((pool) => {
    const tokenContract = new web3.eth.Contract(ERC20 as any, pool.address);
    balanceCalls.push({
      balance: tokenContract.methods.balanceOf(minichef),
    });
    allocPointCalls.push({
      allocPoint: minichefContract.methods.poolInfo(pool.poolId),
    });
    rewardAllocPointCalls.push({
      allocPoint: rewardContract.methods.poolInfo(pool.poolId),
    });
  });

  const multicall = new MultiCall(web3 as any, multicallAddress(chainId));
  const res = await multicall.all([
    balanceCalls,
    allocPointCalls,
    rewardAllocPointCalls,
  ]);

  const balances = res[0].map((v) => new BigNumber(v.balance));
  const allocPoints = res[1].map((v) => v.allocPoint["2"]);
  const rewardAllocPoints = res[2].map((v) => v.allocPoint["2"]);
  return { balances, allocPoints, rewardAllocPoints };
}; */
