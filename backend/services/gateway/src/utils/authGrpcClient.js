
import "dotenv/config";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, "../../../../proto/auth.proto");

const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def);

const AuthService = pkg.auth?.AuthService;
if (!AuthService) {
  throw new Error(
    `AuthService not found in proto. Check "package auth;" and "service AuthService" in auth.proto. PROTO_PATH=${PROTO_PATH}`
  );
}

const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL ;
const client = new AuthService(AUTH_GRPC_URL, grpc.credentials.createInsecure());

export const registerGrpc = (data) =>
  new Promise((resolve, reject) => {
    client.Register(data, (err, res) => (err ? reject(err) : resolve(res)));
  });

export const loginGrpc = (data) =>
  new Promise((resolve, reject) => {
    client.Login(data, (err, res) => (err ? reject(err) : resolve(res)));
  });

export const googleLoginGrpc = (data) =>
  new Promise((resolve, reject) => {
    client.GoogleLogin(data, (err, res) => (err ? reject(err) : resolve(res)));
  });

export const getMeGrpc = (data) =>
  new Promise((resolve, reject) => {
    client.GetMe(data, (err, res) => (err ? reject(err) : resolve(res)));
  });

export const logoutGrpc = (data) =>
  new Promise((resolve, reject) => {
    client.Logout(data, (err, res) => (err ? reject(err) : resolve(res)));
  });