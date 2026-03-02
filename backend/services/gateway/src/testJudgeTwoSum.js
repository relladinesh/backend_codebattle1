import { judgeProblemSubmission } from "./utils/judgeRunner.js";
import { getRandomProblemsGrpc } from "./utils/coreGrpcClient.js";

async function main() {
  // 1) find the Two Sum problemId from DB via gRPC
  const list = await getRandomProblemsGrpc({ topic: "arrays", count: 10 });
  const twoSum = list.find((p) => p.title === "Two Sum");

  if (!twoSum) {
    console.log("Two Sum not found in DB for topic=arrays");
    return;
  }

  console.log("Testing problem:", twoSum);

  // 2) correct JS solution for YOUR input format:
  // input:
  // n
  // n numbers
  // target
  const source_code = `
    const fs = require("fs");
    const data = fs.readFileSync(0,"utf8").trim().split(/\\s+/);
    let idx = 0;
    const n = parseInt(data[idx++], 10);
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(parseInt(data[idx++], 10));
    const target = parseInt(data[idx++], 10);

    const map = new Map();
    for (let i = 0; i < n; i++) {
      const need = target - arr[i];
      if (map.has(need)) {
        console.log(map.get(need) + " " + i);
        process.exit(0);
      }
      map.set(arr[i], i);
    }
    console.log("-1 -1");
  `;

  // 3) run judge submission (JS language_id usually 63 on Judge0)
  const res = await judgeProblemSubmission({
    problemId: twoSum.id,
    language_id: 63,
    source_code,
  });

  console.log("Final Judge Result:");
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
