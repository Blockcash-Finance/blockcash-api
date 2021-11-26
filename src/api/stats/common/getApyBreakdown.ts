import BigNumber from "bignumber.js";

import getFarmWithTradingFeesApy from "../../../utils/getFarmWithTradingFeesApy";
import { compound } from "../../../utils/compound";
import { LpPool } from "../../../types/LpPool";

import {
  BASE_HPY,
  BEEFY_PERFORMANCE_FEE,
  SHARE_AFTER_PERFORMANCE_FEE,
} from "../../../constants";

export interface ApyBreakdown {
  vaultApr?: number;
  compoundingsPerYear?: number;
  blockcashPerformanceFee?: number;
  vaultApy?: number;
  lpFee?: number;
  tradingApr?: number;
  totalApy?: number;
}

export interface ApyBreakdownResult {
  apys: Record<string, number>;
  apyBreakdowns: Record<string, ApyBreakdown>;
}

export const getApyBreakdown = (
  pools: LpPool[],
  tradingAprs: Record<string, BigNumber>,
  farmAprs: BigNumber[],
  providerFee: number,
  performanceFee: number = BEEFY_PERFORMANCE_FEE
): ApyBreakdownResult => {
  const result: ApyBreakdownResult = {
    apys: {},
    apyBreakdowns: {},
  };

  pools.forEach((pool, i) => {
    const farmType = pool?.farmType;
    let shareAfterPerformanceFee = SHARE_AFTER_PERFORMANCE_FEE;
    if (farmType && farmType.name === "love") {
      shareAfterPerformanceFee =
        SHARE_AFTER_PERFORMANCE_FEE / parseInt(farmType.param1);
    }
    const simpleApr = farmAprs[i]?.toNumber();
    const vaultApr = simpleApr * shareAfterPerformanceFee;
    const vaultApy = compound(simpleApr, BASE_HPY, 1, shareAfterPerformanceFee);
    const tradingApr = tradingAprs[pool.address.toLowerCase()]?.toNumber();
    const totalApy = getFarmWithTradingFeesApy(
      simpleApr,
      tradingApr,
      BASE_HPY,
      1,
      shareAfterPerformanceFee
    );

    // Add token to APYs object
    result.apys[pool.name] = totalApy;
    result.apyBreakdowns[pool.name] = {
      vaultApr: vaultApr,
      compoundingsPerYear: BASE_HPY,
      blockcashPerformanceFee: performanceFee,
      vaultApy: vaultApy,
      lpFee: providerFee,
      tradingApr: tradingApr,
      totalApy: totalApy,
    };
  });

  return result;
};

export default getApyBreakdown;
