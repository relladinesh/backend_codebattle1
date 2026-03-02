// backend/gateway/src/utils/judgeRunner.js

import { runOnJudge0 } from "./judgeClient.js";
import { getProblemDetailsGrpc } from "./coreGrpcClient.js";
import { buildWrappedSource } from "./wrappers/leetWrapper.js";

/* -------------------------------------------
   Normalize output (ignore spacing differences)
--------------------------------------------*/
function normalize(s) {
  return String(s ?? "")
    .replace(/\r/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/* -------------------------------------------
   Main Judge Logic
--------------------------------------------*/
export async function judgeProblemSubmission({
  problemId,
  language_id,
  source_code,
}) {
  try {
    // 🔥 Fetch full problem details including hidden testcases
    const details = await getProblemDetailsGrpc({
      problemId,
      includeHidden: true,
    });

    const problem = details?.problem;
    const testcases = details?.testcases || [];

    if (!problem) {
      return {
        verdict: "ERROR",
        message: "Problem not found",
        results: [],
      };
    }

    if (!testcases.length) {
      return {
        verdict: "ERROR",
        message: "No testcases found",
        results: [],
      };
    }

    // 🔥 Build LeetCode-style wrapper
    const wrappedSource = buildWrappedSource({
      language_id,
      user_code: source_code,
      problem,
    });

    const results = [];

    // 🔥 Run each testcase
    for (let i = 0; i < testcases.length; i++) {
      const tc = testcases[i];

      const run = await runOnJudge0({
        language_id,
        source_code: wrappedSource,
        stdin: tc.input,
      });

      const baseVerdict = run.verdict || "ERROR";
      const actual = normalize(run.stdout);
      const expected = normalize(tc.expected);

      // 🔴 Compilation / Runtime errors
      if (baseVerdict !== "AC") {
        results.push({
          index: i + 1,
          isSample: !!tc.isSample,
          verdict: baseVerdict,
          passed: false,
          actual,
          expected,
          time: run.time,
          memory: run.memory,
          stderr: run.stderr,
          compile_output: run.compile_output,
          status: run.status,
        });

        return {
          verdict: baseVerdict,
          message: `Failed on testcase ${i + 1} (${baseVerdict})`,
          results,
        };
      }

      // 🟡 Wrong Answer check
      const passed = actual === expected;

      results.push({
        index: i + 1,
        isSample: !!tc.isSample,
        verdict: passed ? "AC" : "WA",
        passed,
        actual,
        expected,
        time: run.time,
        memory: run.memory,
        stderr: run.stderr,
        compile_output: run.compile_output,
        status: run.status,
      });

      if (!passed) {
        return {
          verdict: "WA",
          message: `Wrong Answer on testcase ${i + 1}`,
          results,
        };
      }
    }

    // 🟢 All Passed
    return {
      verdict: "AC",
      message: "All testcases passed",
      results,
    };
  } catch (error) {
    return {
      verdict: "ERROR",
      message: error?.message || "Judge system error",
      results: [],
    };
  }
}