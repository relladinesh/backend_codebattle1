import {
  getRandomProblemsGrpc,
  getProblemDetailsGrpc,
} from "./utils/coreGrpcClient.js";

import { judgeProblemSubmission } from "./utils/judgeRunner.js";

async function main() {
  const random = await getRandomProblemsGrpc({ topic: "arrays", count: 3 });
  console.log("Random:", random);

  if (!random.length) {
    console.log("❌ No problems returned from gRPC");
    return;
  }

  const detailsList = await Promise.all(
    random.map((p) => getProblemDetailsGrpc({ problemId: p.id }))
  );

  console.log("All details:");
  console.log(JSON.stringify(detailsList, null, 2));

  // ✅ example JS submission (change to actual solution per problem)
  const source_code = `
    const fs = require("fs");
    const input = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
    const a = input[0], b = input[1];
    console.log(a + b);
  `;

  for (const item of detailsList) {
    const problemId = item?.problem?.id;

    if (!problemId) {
      console.log("⚠️ skipping one item (missing problem.id)");
      continue;
    }

    console.log("\n==========================");
    console.log("Submitting to Judge for problemId:", problemId);
    console.log("Title:", item.problem.title);

    const result = await judgeProblemSubmission({
      problemId,
      language_id: 63, // JS
      source_code,
    });

    console.log("Judge Result:");
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
