import "dotenv/config";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, "../../../../proto/core.proto");

const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def);
const core = pkg.core;

const JUDGE_GRPC_URL = process.env.JUDGE_GRPC_URL || "localhost:50052";

const client = new core.JudgeService(
  JUDGE_GRPC_URL,
  grpc.credentials.createInsecure()
);

export function judgeSubmissionGrpc(payload) {
  return new Promise((resolve, reject) => {
    client.JudgeSubmission(payload, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}
