import { getCeloApys } from "../src/api/stats/celo";

async function main() {
  const celoApys = await getCeloApys();
  console.log("celoApys", celoApys);
}

main();
