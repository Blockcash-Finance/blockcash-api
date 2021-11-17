import { getUbeswapCeloApys } from "../src/api/stats/celo/getubeswapCeloApys";

async function main() {
  const celoApys = await getUbeswapCeloApys();
  console.log("celoApys", celoApys);
}

main();
