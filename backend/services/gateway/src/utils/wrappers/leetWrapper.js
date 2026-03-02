// backend/gateway/src/utils/wrappers/leetWrapper.js

const JAVA = 62;
const PY = 71;

/* =====================================================
   ===================== TREE HELPERS ==================
===================================================== */

const JAVA_TREE = `
static class TreeNode {
  int val; TreeNode left; TreeNode right;
  TreeNode(int v){ val=v; }
}
static TreeNode buildTreeLevelOrder(String line){
  line = (line==null? "" : line.trim());
  if(line.isEmpty()) return null;
  String[] arr = line.split("\\\\s+");
  if(arr.length==0 || arr[0].equalsIgnoreCase("null")) return null;

  TreeNode root = new TreeNode(Integer.parseInt(arr[0]));
  java.util.Queue<TreeNode> q = new java.util.LinkedList<>();
  q.add(root);
  int i=1;

  while(!q.isEmpty() && i<arr.length){
    TreeNode cur=q.poll();

    if(i<arr.length && !arr[i].equalsIgnoreCase("null")){
      cur.left = new TreeNode(Integer.parseInt(arr[i]));
      q.add(cur.left);
    }
    i++;

    if(i<arr.length && !arr[i].equalsIgnoreCase("null")){
      cur.right = new TreeNode(Integer.parseInt(arr[i]));
      q.add(cur.right);
    }
    i++;
  }
  return root;
}
static String serializeLevelOrder(TreeNode root){
  if(root==null) return "";
  java.util.ArrayList<String> out = new java.util.ArrayList<>();
  java.util.Queue<TreeNode> q = new java.util.LinkedList<>();
  q.add(root);
  while(!q.isEmpty()){
    TreeNode n=q.poll();
    if(n==null){ out.add("null"); continue; }
    out.add(String.valueOf(n.val));
    q.add(n.left);
    q.add(n.right);
  }
  int j=out.size()-1;
  while(j>=0 && out.get(j).equals("null")) j--;
  out = new java.util.ArrayList<>(out.subList(0, j+1));
  return String.join(" ", out);
}
`;

const PY_TREE = `
class TreeNode:
  def __init__(self, val=0, left=None, right=None):
    self.val=val; self.left=left; self.right=right

def build_tree_level_order(line: str):
  line=(line or "").strip()
  if not line: return None
  arr=line.split()
  if not arr or arr[0].lower()=="null": return None
  root=TreeNode(int(arr[0]))
  q=[root]
  i=1
  while q and i<len(arr):
    cur=q.pop(0)
    if i<len(arr) and arr[i].lower()!="null":
      cur.left=TreeNode(int(arr[i])); q.append(cur.left)
    i+=1
    if i<len(arr) and arr[i].lower()!="null":
      cur.right=TreeNode(int(arr[i])); q.append(cur.right)
    i+=1
  return root

def serialize_level_order(root):
  if not root: return ""
  out=[]
  q=[root]
  while q:
    n=q.pop(0)
    if n is None:
      out.append("null")
      continue
    out.append(str(n.val))
    q.append(n.left); q.append(n.right)
  while out and out[-1]=="null": out.pop()
  return " ".join(out)
`;

export function buildWrappedSource({ language_id, user_code, problem }) {
  const fnName = problem?.fnName || "solve";
  const inputFormat = problem?.inputFormat || "";
  const outputFormat = problem?.outputFormat || "";

  if (!inputFormat || !outputFormat) return user_code;

if (language_id === JAVA) {

    const printArray = `
static void printArr(int[] a){
  if(a==null) return;
  for(int i=0;i<a.length;i++){
    if(i>0) System.out.print(" ");
    System.out.print(a[i]);
  }
}
`;

    // N_ARRAY_TARGET -> PAIR_IDX
    if(inputFormat==="N_ARRAY_TARGET"){
      return `
import java.util.*;
${user_code}
public class Main{
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    int n=Integer.parseInt(sc.nextLine().trim());
    int[] nums=new int[n];
    String[] p=sc.nextLine().trim().split("\\\\s+");
    for(int i=0;i<n;i++) nums[i]=Integer.parseInt(p[i]);
    int target=Integer.parseInt(sc.nextLine().trim());
    Solution sol=new Solution();
    int[] ans=sol.${fnName}(nums,target);
    if(ans==null||ans.length<2) System.out.print("-1 -1");
    else System.out.print(ans[0]+" "+ans[1]);
  }
}`.trim();
    }

    // N_ARRAY -> INT
    if(inputFormat==="N_ARRAY" && outputFormat==="INT"){
      return `
import java.util.*;
${user_code}
public class Main{
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    int n=Integer.parseInt(sc.nextLine().trim());
    int[] nums=new int[n];
    String[] p=sc.nextLine().trim().split("\\\\s+");
    for(int i=0;i<n;i++) nums[i]=Integer.parseInt(p[i]);
    Solution sol=new Solution();
    System.out.print(sol.${fnName}(nums));
  }
}`.trim();
    }

    // N_ARRAY_K
    if(inputFormat==="N_ARRAY_K"){
      return `
import java.util.*;
${user_code}
public class Main{
  ${printArray}
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    int n=Integer.parseInt(sc.nextLine().trim());
    int[] nums=new int[n];
    String[] p=sc.nextLine().trim().split("\\\\s+");
    for(int i=0;i<n;i++) nums[i]=Integer.parseInt(p[i]);
    int k=Integer.parseInt(sc.nextLine().trim());
    Solution sol=new Solution();
    int[] ans=sol.${fnName}(nums,k);
    printArr(ans);
  }
}`.trim();
    }

    // SINGLE_STR
    if(inputFormat==="SINGLE_STR"){
      return `
import java.util.*;
${user_code}
public class Main{
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    String s=sc.hasNextLine()?sc.nextLine():"";
    Solution sol=new Solution();
    Object ans=sol.${fnName}(s);
    if(ans instanceof Boolean)
      System.out.print(((Boolean)ans)?"true":"false");
    else
      System.out.print(ans);
  }
}`.trim();
    }

    // TWO_STR
    if(inputFormat==="TWO_STR"){
      return `
import java.util.*;
${user_code}
public class Main{
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    String a=sc.nextLine();
    String b=sc.nextLine();
    Solution sol=new Solution();
    Object ans=sol.${fnName}(a,b);
    if(ans instanceof Boolean)
      System.out.print(((Boolean)ans)?"true":"false");
    else
      System.out.print(ans);
  }
}`.trim();
    }

    // SINGLE_INT
    if(inputFormat==="SINGLE_INT"){
      return `
import java.util.*;
${user_code}
public class Main{
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    int n=Integer.parseInt(sc.nextLine().trim());
    Solution sol=new Solution();
    System.out.print(sol.${fnName}(n));
  }
}`.trim();
    }

    // COINS_AMOUNT
    if(inputFormat==="COINS_AMOUNT"){
      return `
import java.util.*;
${user_code}
public class Main{
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    int n=Integer.parseInt(sc.nextLine().trim());
    int[] coins=new int[n];
    String[] p=sc.nextLine().trim().split("\\\\s+");
    for(int i=0;i<n;i++) coins[i]=Integer.parseInt(p[i]);
    int amt=Integer.parseInt(sc.nextLine().trim());
    Solution sol=new Solution();
    System.out.print(sol.${fnName}(coins,amt));
  }
}`.trim();
    }

    // TREE_LEVEL_ORDER
    if(inputFormat==="TREE_LEVEL_ORDER"){
      return `
import java.util.*;
${user_code}
public class Main{
  ${JAVA_TREE}
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    String line=sc.hasNextLine()?sc.nextLine():"";
    TreeNode root=buildTreeLevelOrder(line);
    Solution sol=new Solution();
    Object ans=sol.${fnName}(root);
    if(ans instanceof Boolean)
      System.out.print(((Boolean)ans)?"true":"false");
    else if(ans instanceof TreeNode)
      System.out.print(serializeLevelOrder((TreeNode)ans));
    else
      System.out.print(ans);
  }
}`.trim();
    }

    return user_code;
  }


if (language_id === PY) {

    const readHelpers = `
import sys
def _read_int():
  return int(sys.stdin.readline().strip() or "0")
def _read_ints():
  return list(map(int, sys.stdin.readline().strip().split()))
`.trim();

    if(inputFormat==="N_ARRAY_TARGET"){
      return `
${user_code}
${readHelpers}
if __name__=="__main__":
  n=_read_int()
  nums=_read_ints()
  target=_read_int()
  sol=Solution()
  ans=sol.${fnName}(nums,target)
  if not ans or len(ans)<2:
    print("-1 -1")
  else:
    print(f"{ans[0]} {ans[1]}")
`.trim();
    }

    if(inputFormat==="N_ARRAY"){
      return `
${user_code}
${readHelpers}
if __name__=="__main__":
  n=_read_int()
  nums=_read_ints()
  sol=Solution()
  print(sol.${fnName}(nums))
`.trim();
    }

    if(inputFormat==="SINGLE_STR"){
      return `
${user_code}
import sys
if __name__=="__main__":
  s=sys.stdin.readline().rstrip("\\n")
  sol=Solution()
  ans=sol.${fnName}(s)
  if isinstance(ans,bool):
    print("true" if ans else "false")
  else:
    print(ans)
`.trim();
    }

    if(inputFormat==="TWO_STR"){
      return `
${user_code}
import sys
if __name__=="__main__":
  a=sys.stdin.readline().rstrip("\\n")
  b=sys.stdin.readline().rstrip("\\n")
  sol=Solution()
  ans=sol.${fnName}(a,b)
  if isinstance(ans,bool):
    print("true" if ans else "false")
  else:
    print(ans)
`.trim();
    }

    if(inputFormat==="SINGLE_INT"){
      return `
${user_code}
import sys
if __name__=="__main__":
  n=int(sys.stdin.readline().strip() or "0")
  sol=Solution()
  print(sol.${fnName}(n))
`.trim();
    }

    if(inputFormat==="COINS_AMOUNT"){
      return `
${user_code}
${readHelpers}
if __name__=="__main__":
  n=_read_int()
  coins=_read_ints()
  amt=_read_int()
  sol=Solution()
  print(sol.${fnName}(coins,amt))
`.trim();
    }

    if(inputFormat==="TREE_LEVEL_ORDER"){
      return `
${user_code}
${PY_TREE}
import sys
if __name__=="__main__":
  line=sys.stdin.readline().rstrip("\\n")
  root=build_tree_level_order(line)
  sol=Solution()
  ans=sol.${fnName}(root)
  if isinstance(ans,bool):
    print("true" if ans else "false")
  else:
    print(ans)
`.trim();
    }

    return user_code;
  }

  return user_code;
}