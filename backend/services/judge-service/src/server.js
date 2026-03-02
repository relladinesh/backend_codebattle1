import "dotenv/config";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

import { getProblemDetailsGrpc } from "./clients/coreGrpcClient.js";
import { runOnJudge0 } from "./judge/judge0.js";
import { normalize } from "./judge/normalize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, "../../../proto/core.proto");

const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def);
const core = pkg.core;

function verdictFromJudge0(statusDesc, hasCompileErr, hasRuntimeErr) {
  const s = String(statusDesc || "").toLowerCase();
  if (hasCompileErr) return "CE";
  if (hasRuntimeErr) return "RE";
  if (s.includes("time limit")) return "TLE";
  return null; // compare outputs
}

export function registerJudgeService(server, corePkg) {
  server.addService(corePkg.JudgeService.service, {
    JudgeSubmission: async (call, cb) => {
      try {
        const { problemId, language, sourceCode } = call.request;

        // 1) get problem + sample testcases (later you can return hidden too)
        const details = await getProblemDetailsGrpc(problemId);
        const testcases = details?.testcases || [];

        if (!details?.problem) {
          return cb(null, { verdict: "ERROR", passed: 0, total: 0, scoreDelta: 0 });
        }
        if (!testcases.length) {
          return cb(null, { verdict: "ERROR", passed: 0, total: 0, scoreDelta: 0 });
        }

        // 2) run for each testcase
        let passed = 0;

        for (const tc of testcases) {
          const run = await runOnJudge0({
            language,
            sourceCode,
            stdin: tc.input,
          });

          const hasCompileErr = !!run.compileOutput;
          const hasRuntimeErr = !!run.stderr;

          const forced = verdictFromJudge0(run.statusDesc, hasCompileErr, hasRuntimeErr);
          if (forced) {
            // stop early on CE/RE/TLE
            return cb(null, {
              verdict: forced,
              passed,
              total: testcases.length,
              scoreDelta: 0,
            });
          }

          const out = normalize(run.stdout);
          const exp = normalize(tc.expected);

          if (out === exp) passed++;
          else {
            return cb(null, {
              verdict: "WA",
              passed,
              total: testcases.length,
              scoreDelta: 0,
            });
          }
        }

        // if all passed
        const scoreDelta = 10; // you can change scoring
        cb(null, {
          verdict: "AC",
          passed,
          total: testcases.length,
          scoreDelta,
        });
      } catch (e) {
        console.error("[judge] error:", e);
        cb(null, { verdict: "ERROR", passed: 0, total: 0, scoreDelta: 0 });
      }
    },
  });
}

const server = new grpc.Server();
registerJudgeService(server, core);

const PORT = process.env.JUDGE_GRPC_PORT || "50052";

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err) => {
    if (err) throw err;
    console.log(`[judge] gRPC running on ${PORT}`);
    server.start();
  }
);
