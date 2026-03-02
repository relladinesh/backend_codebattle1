// gateway/src/utils/wrapperGenerator.js

function splitLines(s) {
  return String(s ?? "").replace(/\r/g, "").split("\n");
}

function jsEscape(str) {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
}

function pyEscape(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
}

/**
 * ✅ Our stdin formats are based on your seed.sql
 * We will generate parser+printer per format.
 *
 * Supported inputFormat:
 * - N_ARRAY_TARGET     : n \n nums... \n target
 * - N_ARRAY            : n \n nums...
 * - N_ARRAY_K          : n \n nums... \n k
 * - INTERVALS          : m \n a b \n a b ...
 * - TWO_STRINGS        : s \n t
 * - STRING             : s
 * - INTEGER            : n
 * - N_STRINGS          : m \n str \n str...
 * - COINS_AMOUNT       : m \n coins... \n amount
 * - GRID               : r c \n rowStr \n rowStr...
 * - COURSES_PREREQS    : n m \n a b ...
 * - TIMES_N_K          : n m k \n u v w ...
 * - BEGIN_END_WORDLIST : begin \n end \n m \n word...
 */

export function buildWrappedSource({ language_id, userSource, problem, stdin }) {
  if (!problem?.fnName) throw new Error("Problem fnName missing");
  const lang = Number(language_id);

  if (lang === 63) return wrapJS(userSource, problem, stdin);
  if (lang === 71) return wrapPython(userSource, problem, stdin);
  if (lang === 62) return wrapJava(userSource, problem, stdin);
  if (lang === 54) return wrapCpp(userSource, problem, stdin);

  throw new Error("Unsupported language_id: " + language_id);
}

/* =========================
   ✅ JS WRAPPER
   ========================= */
function wrapJS(userSource, p, stdin) {
  const { parseJS, callExprJS, printJS } = makeJSLogic(p);

  return `
${userSource}

function __readAllStdin() {
  const fs = require("fs");
  return fs.readFileSync(0, "utf8").replace(/\\r/g,"");
}

${parseJS}

function __main() {
  const input = __readAllStdin();
  const ctx = __parse(input);
  const sol = new Solution();
  const ans = ${callExprJS};
  ${printJS}
}

__main();
`;
}

function makeJSLogic(p) {
  const fn = p.fnName;
  const fmt = String(p.inputFormat || "");
  const outFmt = String(p.outputFormat || "");

  // All parsers return { args: [...] } so call = sol.fn(...args)
  let parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  function nextLine(){ return (idx < lines.length ? lines[idx++] : ""); }
  function nextIntsLine() {
    const s = nextLine().trim();
    if (!s) return [];
    return s.split(/\\s+/).map(Number);
  }

  // default
  return { args: [] };
}
`;

  let callExprJS = `sol.${fn}(...ctx.args)`;

  if (fmt === "N_ARRAY_TARGET") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  function nextLine(){ return (idx < lines.length ? lines[idx++] : ""); }

  const n = Number(nextLine().trim());
  const nums = (nextLine().trim().split(/\\s+/).filter(Boolean)).map(Number).slice(0,n);
  const target = Number(nextLine().trim());
  return { args: [nums, target] };
}
`;
  } else if (fmt === "N_ARRAY") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  function nextLine(){ return (idx < lines.length ? lines[idx++] : ""); }
  const n = Number(nextLine().trim());
  const nums = (nextLine().trim().split(/\\s+/).filter(Boolean)).map(Number).slice(0,n);
  return { args: [nums] };
}
`;
  } else if (fmt === "N_ARRAY_K") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  function nextLine(){ return (idx < lines.length ? lines[idx++] : ""); }
  const n = Number(nextLine().trim());
  const nums = (nextLine().trim().split(/\\s+/).filter(Boolean)).map(Number).slice(0,n);
  const k = Number(nextLine().trim());
  return { args: [nums, k] };
}
`;
  } else if (fmt === "INTERVALS") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  function nextLine(){ return (idx < lines.length ? lines[idx++] : ""); }
  const m = Number(nextLine().trim());
  const intervals = [];
  for (let i=0;i<m;i++){
    const [a,b] = nextLine().trim().split(/\\s+/).map(Number);
    intervals.push([a,b]);
  }
  return { args: [intervals] };
}
`;
  } else if (fmt === "TWO_STRINGS") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  const s = (lines[0] ?? "").trim();
  const t = (lines[1] ?? "").trim();
  return { args: [s, t] };
}
`;
  } else if (fmt === "STRING") {
    parseJS = `
function __parse(input) {
  const s = input.split("\\n")[0] ?? "";
  return { args: [s.trim()] };
}
`;
  } else if (fmt === "INTEGER") {
    parseJS = `
function __parse(input) {
  const n = Number((input.split("\\n")[0] ?? "0").trim());
  return { args: [n] };
}
`;
  } else if (fmt === "N_STRINGS") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  const m = Number((lines[idx++] ?? "0").trim());
  const arr = [];
  for (let i=0;i<m;i++) arr.push((lines[idx++] ?? "").trim());
  return { args: [arr] };
}
`;
  } else if (fmt === "COINS_AMOUNT") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  const m = Number((lines[idx++] ?? "0").trim());
  const coins = ((lines[idx++] ?? "").trim().split(/\\s+/).filter(Boolean)).map(Number).slice(0,m);
  const amount = Number((lines[idx++] ?? "0").trim());
  return { args: [coins, amount] };
}
`;
  } else if (fmt === "GRID") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  const [r,c] = (lines[idx++] ?? "").trim().split(/\\s+/).map(Number);
  const grid = [];
  for (let i=0;i<r;i++){
    grid.push((lines[idx++] ?? "").trim().split(""));
  }
  return { args: [grid] };
}
`;
  } else if (fmt === "COURSES_PREREQS") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  const [n,m] = (lines[idx++] ?? "").trim().split(/\\s+/).map(Number);
  const prereq = [];
  for (let i=0;i<m;i++){
    const [a,b] = (lines[idx++] ?? "").trim().split(/\\s+/).map(Number);
    prereq.push([a,b]);
  }
  return { args: [n, prereq] };
}
`;
  } else if (fmt === "TIMES_N_K") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  const [n,m,k] = (lines[idx++] ?? "").trim().split(/\\s+/).map(Number);
  const times = [];
  for (let i=0;i<m;i++){
    const [u,v,w] = (lines[idx++] ?? "").trim().split(/\\s+/).map(Number);
    times.push([u,v,w]);
  }
  return { args: [times, n, k] };
}
`;
  } else if (fmt === "BEGIN_END_WORDLIST") {
    parseJS = `
function __parse(input) {
  const lines = input.split("\\n");
  let idx = 0;
  const beginWord = (lines[idx++] ?? "").trim();
  const endWord = (lines[idx++] ?? "").trim();
  const m = Number((lines[idx++] ?? "0").trim());
  const wordList = [];
  for (let i=0;i<m;i++) wordList.push((lines[idx++] ?? "").trim());
  return { args: [beginWord, endWord, wordList] };
}
`;
  }

  let printJS = `console.log(String(ans));`;

  if (outFmt === "PAIR_IDX" || outFmt === "N_ARRAY") {
    printJS = `
if (Array.isArray(ans)) console.log(ans.join(" "));
else console.log(String(ans));
`;
  } else if (outFmt === "INTERVALS") {
    printJS = `
if (!ans || !ans.length) { console.log(""); return; }
const lines = ans.map(it => it[0] + " " + it[1]);
console.log(lines.join("\\n"));
`;
  } else if (outFmt === "BOOLEAN") {
    printJS = `console.log(ans ? "true" : "false");`;
  } else if (outFmt === "STRING") {
    printJS = `console.log(String(ans));`;
  }

  return { parseJS, callExprJS, printJS };
}

/* =========================
   ✅ PYTHON WRAPPER
   ========================= */
function wrapPython(userSource, p) {
  const { parsePY, callExprPY, printPY } = makePYLogic(p);

  return `
${userSource}

import sys

${parsePY}

def __main():
  data = sys.stdin.read().replace("\\r","")
  args = __parse(data)
  sol = Solution()
  ans = ${callExprPY}
  ${printPY}

if __name__ == "__main__":
  __main()
`;
}

function makePYLogic(p) {
  const fn = p.fnName;
  const fmt = String(p.inputFormat || "");
  const outFmt = String(p.outputFormat || "");

  let parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  return []
`;

  let callExprPY = `sol.${fn}(*args)`;

  if (fmt === "N_ARRAY_TARGET") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  n = int(lines[0].strip() or 0)
  nums = list(map(int, (lines[1].strip().split() if len(lines) > 1 else [])))[:n]
  target = int(lines[2].strip() if len(lines) > 2 and lines[2].strip() else 0)
  return [nums, target]
`;
  } else if (fmt === "N_ARRAY") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  n = int(lines[0].strip() or 0)
  nums = list(map(int, (lines[1].strip().split() if len(lines) > 1 else [])))[:n]
  return [nums]
`;
  } else if (fmt === "N_ARRAY_K") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  n = int(lines[0].strip() or 0)
  nums = list(map(int, (lines[1].strip().split() if len(lines) > 1 else [])))[:n]
  k = int(lines[2].strip() if len(lines) > 2 and lines[2].strip() else 0)
  return [nums, k]
`;
  } else if (fmt === "INTERVALS") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  m = int(lines[0].strip() or 0)
  intervals = []
  for i in range(m):
    a,b = map(int, lines[i+1].strip().split())
    intervals.append([a,b])
  return [intervals]
`;
  } else if (fmt === "TWO_STRINGS") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  s = (lines[0] if len(lines)>0 else "").strip()
  t = (lines[1] if len(lines)>1 else "").strip()
  return [s,t]
`;
  } else if (fmt === "STRING") {
    parsePY = `
def __parse(data: str):
  s = (data.split("\\n")[0] if data else "").strip()
  return [s]
`;
  } else if (fmt === "INTEGER") {
    parsePY = `
def __parse(data: str):
  n = int((data.split("\\n")[0] if data else "0").strip() or 0)
  return [n]
`;
  } else if (fmt === "N_STRINGS") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  m = int(lines[0].strip() or 0)
  arr = []
  for i in range(m):
    arr.append((lines[i+1] if i+1 < len(lines) else "").strip())
  return [arr]
`;
  } else if (fmt === "COINS_AMOUNT") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  m = int(lines[0].strip() or 0)
  coins = list(map(int, (lines[1].strip().split() if len(lines)>1 else [])))[:m]
  amount = int(lines[2].strip() if len(lines)>2 and lines[2].strip() else 0)
  return [coins, amount]
`;
  } else if (fmt === "GRID") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  r,c = map(int, (lines[0].strip().split() if lines and lines[0].strip() else [0,0]))
  grid = []
  for i in range(r):
    row = (lines[i+1] if i+1 < len(lines) else "").strip()
    grid.append(list(row))
  return [grid]
`;
  } else if (fmt === "COURSES_PREREQS") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  n,m = map(int, lines[0].strip().split())
  prereq = []
  for i in range(m):
    a,b = map(int, lines[i+1].strip().split())
    prereq.append([a,b])
  return [n, prereq]
`;
  } else if (fmt === "TIMES_N_K") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  n,m,k = map(int, lines[0].strip().split())
  times = []
  for i in range(m):
    u,v,w = map(int, lines[i+1].strip().split())
    times.append([u,v,w])
  return [times, n, k]
`;
  } else if (fmt === "BEGIN_END_WORDLIST") {
    parsePY = `
def __parse(data: str):
  lines = data.split("\\n")
  beginWord = (lines[0] if len(lines)>0 else "").strip()
  endWord = (lines[1] if len(lines)>1 else "").strip()
  m = int((lines[2] if len(lines)>2 else "0").strip() or 0)
  wordList = []
  for i in range(m):
    wordList.append((lines[3+i] if 3+i < len(lines) else "").strip())
  return [beginWord, endWord, wordList]
`;
  }

  let printPY = `print(str(ans))`;

  if (outFmt === "PAIR_IDX" || outFmt === "N_ARRAY") {
    printPY = `
if isinstance(ans, (list, tuple)):
  print(" ".join(map(str, ans)))
else:
  print(str(ans))
`;
  } else if (outFmt === "INTERVALS") {
    printPY = `
if not ans:
  print("")
else:
  for it in ans:
    print(str(it[0]) + " " + str(it[1]))
`;
  } else if (outFmt === "BOOLEAN") {
    printPY = `print("true" if ans else "false")`;
  } else if (outFmt === "STRING") {
    printPY = `print(str(ans))`;
  }

  return { parsePY, callExprPY, printPY };
}

/* =========================
   ✅ JAVA WRAPPER (simple & safe)
   ========================= */
function wrapJava(userSource, p) {
  const fn = p.fnName;
  const fmt = String(p.inputFormat || "");
  const outFmt = String(p.outputFormat || "");

  // In Java we parse using Scanner. It works with your inputs.
  const javaCall = javaCallExpr(fn, fmt);
  const javaPrint = javaPrintExpr(outFmt);

  return `
import java.util.*;
import java.io.*;

${userSource}

public class Main {
  static class FastScanner {
    private final BufferedReader br;
    private StringTokenizer st;
    FastScanner() { br = new BufferedReader(new InputStreamReader(System.in)); }
    String next() throws IOException {
      while (st == null || !st.hasMoreElements()) {
        String line = br.readLine();
        if (line == null) return null;
        st = new StringTokenizer(line);
      }
      return st.nextToken();
    }
    int nextInt() throws IOException { return Integer.parseInt(next()); }
    String nextLineRaw() throws IOException { return br.readLine(); }
  }

  public static void main(String[] args) throws Exception {
    FastScanner fs = new FastScanner();
    Solution sol = new Solution();

    Object ans = ${javaCall};

    ${javaPrint}
  }
}
`;
}

function javaCallExpr(fn, fmt) {
  if (fmt === "N_ARRAY_TARGET") {
    return `(Object)(() -> {
      int n = Integer.parseInt(fs.next());
      int[] nums = new int[n];
      for(int i=0;i<n;i++) nums[i] = Integer.parseInt(fs.next());
      int target = Integer.parseInt(fs.next());
      return sol.${fn}(nums, target);
    }).get()`;
  }
  if (fmt === "N_ARRAY") {
    return `(Object)(() -> {
      int n = Integer.parseInt(fs.next());
      int[] nums = new int[n];
      for(int i=0;i<n;i++) nums[i] = Integer.parseInt(fs.next());
      return sol.${fn}(nums);
    }).get()`;
  }
  if (fmt === "N_ARRAY_K") {
    return `(Object)(() -> {
      int n = Integer.parseInt(fs.next());
      int[] nums = new int[n];
      for(int i=0;i<n;i++) nums[i] = Integer.parseInt(fs.next());
      int k = Integer.parseInt(fs.next());
      sol.${fn}(nums, k);
      return nums;
    }).get()`;
  }
  if (fmt === "INTERVALS") {
    return `(Object)(() -> {
      int m = Integer.parseInt(fs.next());
      int[][] intervals = new int[m][2];
      for(int i=0;i<m;i++){ intervals[i][0]=Integer.parseInt(fs.next()); intervals[i][1]=Integer.parseInt(fs.next()); }
      return sol.${fn}(intervals);
    }).get()`;
  }
  if (fmt === "TWO_STRINGS") {
    return `(Object)(() -> {
      String s = fs.next();
      String t = fs.next();
      return sol.${fn}(s,t);
    }).get()`;
  }
  if (fmt === "STRING") {
    return `(Object)(() -> {
      String s = fs.next();
      return sol.${fn}(s);
    }).get()`;
  }
  if (fmt === "INTEGER") {
    return `(Object)(() -> {
      int n = Integer.parseInt(fs.next());
      return sol.${fn}(n);
    }).get()`;
  }
  if (fmt === "N_STRINGS") {
    return `(Object)(() -> {
      int m = Integer.parseInt(fs.next());
      String[] arr = new String[m];
      for(int i=0;i<m;i++) arr[i]=fs.next();
      return sol.${fn}(arr);
    }).get()`;
  }
  if (fmt === "COINS_AMOUNT") {
    return `(Object)(() -> {
      int m = Integer.parseInt(fs.next());
      int[] coins = new int[m];
      for(int i=0;i<m;i++) coins[i]=Integer.parseInt(fs.next());
      int amount = Integer.parseInt(fs.next());
      return sol.${fn}(coins, amount);
    }).get()`;
  }
  return `(Object)null`;
}

function javaPrintExpr(outFmt) {
  if (outFmt === "PAIR_IDX" || outFmt === "N_ARRAY") {
    return `
if (ans instanceof int[]) {
  int[] a = (int[]) ans;
  StringBuilder sb = new StringBuilder();
  for(int i=0;i<a.length;i++){
    if(i>0) sb.append(" ");
    sb.append(a[i]);
  }
  System.out.print(sb.toString());
} else {
  System.out.print(String.valueOf(ans));
}
`;
  }
  if (outFmt === "INTERVALS") {
    return `
int[][] arr = (int[][]) ans;
if (arr == null || arr.length == 0) { System.out.print(""); return; }
StringBuilder sb = new StringBuilder();
for(int i=0;i<arr.length;i++){
  sb.append(arr[i][0]).append(" ").append(arr[i][1]);
  if(i+1<arr.length) sb.append("\\n");
}
System.out.print(sb.toString());
`;
  }
  if (outFmt === "BOOLEAN") return `System.out.print(((Boolean)ans) ? "true" : "false");`;
  return `System.out.print(String.valueOf(ans));`;
}

/* =========================
   ✅ C++ WRAPPER (minimal)
   ========================= */
function wrapCpp(userSource, p) {
  const fn = p.fnName;
  const fmt = String(p.inputFormat || "");
  const outFmt = String(p.outputFormat || "");

  const cppParseCall = cppCallExpr(fn, fmt, outFmt);
  return `
#include <bits/stdc++.h>
using namespace std;

${userSource}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  Solution sol;

  ${cppParseCall}

  return 0;
}
`;
}

function cppCallExpr(fn, fmt, outFmt) {
  const printPair = (varName) => `cout<<${varName}[0]<<" "<<${varName}[1];`;
  const printVec = (varName) => `
for (int i=0;i<(int)${varName}.size();i++){
  if(i) cout<<" ";
  cout<<${varName}[i];
}`;
  const printIntervals = (varName) => `
for (int i=0;i<(int)${varName}.size();i++){
  cout<<${varName}[i][0]<<" "<<${varName}[i][1];
  if(i+1<(int)${varName}.size()) cout<<"\\n";
}`;

  if (fmt === "N_ARRAY_TARGET") {
    const out = outFmt === "PAIR_IDX" ? "auto ans = sol."+fn+"(nums, target);\n"+printPair("ans") : "auto ans = sol."+fn+"(nums, target);\ncout<<ans;";
    return `
int n; cin>>n;
vector<int> nums(n);
for(int i=0;i<n;i++) cin>>nums[i];
int target; cin>>target;
${out}
`;
  }

  if (fmt === "N_ARRAY") {
    const out = outFmt === "N_ARRAY" ? "auto ans = sol."+fn+"(nums);\n"+printVec("ans") : "auto ans = sol."+fn+"(nums);\ncout<<ans;";
    return `
int n; cin>>n;
vector<int> nums(n);
for(int i=0;i<n;i++) cin>>nums[i];
${out}
`;
  }

  if (fmt === "N_ARRAY_K") {
    return `
int n; cin>>n;
vector<int> nums(n);
for(int i=0;i<n;i++) cin>>nums[i];
int k; cin>>k;
sol.${fn}(nums, k);
${printVec("nums")}
`;
  }

  if (fmt === "INTERVALS") {
    return `
int m; cin>>m;
vector<vector<int>> intervals(m, vector<int>(2));
for(int i=0;i<m;i++) cin>>intervals[i][0]>>intervals[i][1];
auto ans = sol.${fn}(intervals);
${printIntervals("ans")}
`;
  }

  if (fmt === "TWO_STRINGS") {
    return `
string s,t; 
cin>>s>>t;
auto ans = sol.${fn}(s,t);
cout<<(ans ? "true" : "false");
`;
  }

  if (fmt === "STRING") {
    return `
string s; 
cin>>s;
auto ans = sol.${fn}(s);
cout<<ans;
`;
  }

  if (fmt === "INTEGER") {
    return `
int n; cin>>n;
auto ans = sol.${fn}(n);
cout<<ans;
`;
  }

  return `cout<<"";`;
}