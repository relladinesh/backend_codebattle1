BEGIN;

-- ==========================
-- CLEAR OLD DATA
-- ==========================
DELETE FROM "Testcase";
DELETE FROM "Problem";

-- ==========================
-- INSERT PROBLEMS
-- ==========================
INSERT INTO "Problem"
("id","title","statement","topic","difficulty","createdAt","updatedAt")
VALUES
-- ARRAYS
(gen_random_uuid(),'Two Sum','Find two numbers that add up to target','arrays','easy',NOW(),NOW()),
(gen_random_uuid(),'Maximum Subarray','Find the largest sum contiguous subarray','arrays','medium',NOW(),NOW()),
(gen_random_uuid(),'Rotate Array','Rotate array by k steps','arrays','easy',NOW(),NOW()),
(gen_random_uuid(),'Merge Intervals','Merge overlapping intervals','arrays','medium',NOW(),NOW()),
(gen_random_uuid(),'Product Except Self','Return product of array except self','arrays','medium',NOW(),NOW()),

-- STRINGS
(gen_random_uuid(),'Valid Anagram','Check whether two strings are anagrams','strings','easy',NOW(),NOW()),
(gen_random_uuid(),'Longest Substring','Longest substring without repeating characters','strings','medium',NOW(),NOW()),
(gen_random_uuid(),'Group Anagrams','Group strings that are anagrams','strings','medium',NOW(),NOW()),
(gen_random_uuid(),'Palindrome Check','Check if string is palindrome','strings','easy',NOW(),NOW()),
(gen_random_uuid(),'String Compression','Compress repeating characters','strings','medium',NOW(),NOW()),

-- DP
(gen_random_uuid(),'Climbing Stairs','Count ways to reach nth step','dp','easy',NOW(),NOW()),
(gen_random_uuid(),'House Robber','Max sum without adjacent houses','dp','medium',NOW(),NOW()),
(gen_random_uuid(),'Coin Change','Minimum coins to make amount','dp','medium',NOW(),NOW()),
(gen_random_uuid(),'LIS','Length of longest increasing subsequence','dp','medium',NOW(),NOW()),
(gen_random_uuid(),'Edit Distance','Min operations to convert one string to another','dp','hard',NOW(),NOW()),

-- GRAPHS
(gen_random_uuid(),'Number of Islands','Count islands in a grid','graphs','medium',NOW(),NOW()),
(gen_random_uuid(),'Course Schedule','Detect cycle in prerequisites graph','graphs','medium',NOW(),NOW()),
(gen_random_uuid(),'Clone Graph','Clone a connected graph','graphs','medium',NOW(),NOW()),
(gen_random_uuid(),'Network Delay','Time for signal to reach all nodes','graphs','hard',NOW(),NOW()),
(gen_random_uuid(),'Word Ladder','Shortest transformation sequence using BFS','graphs','hard',NOW(),NOW()),

-- TREES
(gen_random_uuid(),'Max Depth','Find maximum depth of a binary tree','trees','easy',NOW(),NOW()),
(gen_random_uuid(),'Same Tree','Check if two binary trees are same','trees','easy',NOW(),NOW()),
(gen_random_uuid(),'Invert Tree','Invert a binary tree','trees','easy',NOW(),NOW()),
(gen_random_uuid(),'Level Order','Binary tree level order traversal','trees','medium',NOW(),NOW()),
(gen_random_uuid(),'LCA','Lowest common ancestor in binary tree','trees','medium',NOW(),NOW());

-- ==========================================================
-- INSERT TESTCASES (5 per problem, 2 sample + 3 hidden)
-- FIXED UUID MAPPING ✅
-- ==========================================================

-- ===================== ARRAYS =====================

-- Two Sum
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
2 7 11 15
9', '0 1', true FROM "Problem" WHERE title='Two Sum';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
3 2 4
6', '1 2', true FROM "Problem" WHERE title='Two Sum';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2
3 3
6', '0 1', false FROM "Problem" WHERE title='Two Sum';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
1 5 3 7 9
10', '0 4', false FROM "Problem" WHERE title='Two Sum';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
1 2 3 4
8', '-1 -1', false FROM "Problem" WHERE title='Two Sum';

-- Maximum Subarray
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '9
-2 1 -3 4 -1 2 1 -5 4', '6', true FROM "Problem" WHERE title='Maximum Subarray';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
5 4 -1 7 8', '23', true FROM "Problem" WHERE title='Maximum Subarray';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1
-7', '-7', false FROM "Problem" WHERE title='Maximum Subarray';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '6
1 -1 1 -1 1 -1', '1', false FROM "Problem" WHERE title='Maximum Subarray';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
-1 -2 -3', '-1', false FROM "Problem" WHERE title='Maximum Subarray';

-- Rotate Array
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '7
1 2 3 4 5 6 7
3', '5 6 7 1 2 3 4', true FROM "Problem" WHERE title='Rotate Array';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
-1 -100 3 99
2', '3 99 -1 -100', true FROM "Problem" WHERE title='Rotate Array';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
1 2 3
1', '3 1 2', false FROM "Problem" WHERE title='Rotate Array';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
10 20 30 40 50
5', '10 20 30 40 50', false FROM "Problem" WHERE title='Rotate Array';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
10 20 30 40 50
7', '40 50 10 20 30', false FROM "Problem" WHERE title='Rotate Array';

-- Merge Intervals
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
1 3
2 6
8 10
15 18', '1 6
8 10
15 18', true FROM "Problem" WHERE title='Merge Intervals';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2
1 4
4 5', '1 5', true FROM "Problem" WHERE title='Merge Intervals';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
1 2
3 4
5 6', '1 2
3 4
5 6', false FROM "Problem" WHERE title='Merge Intervals';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
1 10
2 3
4 8
11 12
12 15', '1 10
11 15', false FROM "Problem" WHERE title='Merge Intervals';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
5 7
1 2
2 4
8 10', '1 4
5 7
8 10', false FROM "Problem" WHERE title='Merge Intervals';

-- Product Except Self
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
1 2 3 4', '24 12 8 6', true FROM "Problem" WHERE title='Product Except Self';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
-1 1 0 -3 3', '0 0 9 0 0', true FROM "Problem" WHERE title='Product Except Self';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
2 3 4', '12 8 6', false FROM "Problem" WHERE title='Product Except Self';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1
10', '1', false FROM "Problem" WHERE title='Product Except Self';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
0 0 2 3', '0 0 0 0', false FROM "Problem" WHERE title='Product Except Self';

-- ===================== STRINGS =====================

-- Valid Anagram
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'anagram
nagaram', 'true', true FROM "Problem" WHERE title='Valid Anagram';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'rat
car', 'false', true FROM "Problem" WHERE title='Valid Anagram';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'listen
silent', 'true', false FROM "Problem" WHERE title='Valid Anagram';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'hello
world', 'false', false FROM "Problem" WHERE title='Valid Anagram';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'a
a', 'true', false FROM "Problem" WHERE title='Valid Anagram';

-- Longest Substring
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'abcabcbb', '3', true FROM "Problem" WHERE title='Longest Substring';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'pwwkew', '3', true FROM "Problem" WHERE title='Longest Substring';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'bbbbb', '1', false FROM "Problem" WHERE title='Longest Substring';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '', '0', false FROM "Problem" WHERE title='Longest Substring';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'abcdef', '6', false FROM "Problem" WHERE title='Longest Substring';

-- Group Anagrams
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '6
eat
tea
tan
ate
nat
bat', 'ate,eat,tea|bat|nat,tan', true FROM "Problem" WHERE title='Group Anagrams';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
abc
bca
cab
zzz', 'abc,bca,cab|zzz', true FROM "Problem" WHERE title='Group Anagrams';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
a
b
c', 'a|b|c', false FROM "Problem" WHERE title='Group Anagrams';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
listen
silent
enlist
google
gogole', 'enlist,listen,silent|gogole,google', false FROM "Problem" WHERE title='Group Anagrams';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1
aaaa', 'aaaa', false FROM "Problem" WHERE title='Group Anagrams';

-- Palindrome Check
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'racecar', 'true', true FROM "Problem" WHERE title='Palindrome Check';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'hello', 'false', true FROM "Problem" WHERE title='Palindrome Check';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'a', 'true', false FROM "Problem" WHERE title='Palindrome Check';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'abba', 'true', false FROM "Problem" WHERE title='Palindrome Check';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'Racecar', 'false', false FROM "Problem" WHERE title='Palindrome Check';

-- String Compression
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'aaabbc', 'a3b2c1', true FROM "Problem" WHERE title='String Compression';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'abcd', 'a1b1c1d1', true FROM "Problem" WHERE title='String Compression';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'a', 'a1', false FROM "Problem" WHERE title='String Compression';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'zzzzzz', 'z6', false FROM "Problem" WHERE title='String Compression';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'aabcccccaaa', 'a2b1c5a3', false FROM "Problem" WHERE title='String Compression';

-- ===================== DP =====================

-- Climbing Stairs
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2', '2', true FROM "Problem" WHERE title='Climbing Stairs';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3', '3', true FROM "Problem" WHERE title='Climbing Stairs';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1', '1', false FROM "Problem" WHERE title='Climbing Stairs';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5', '8', false FROM "Problem" WHERE title='Climbing Stairs';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '10', '89', false FROM "Problem" WHERE title='Climbing Stairs';

-- House Robber
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
1 2 3 1', '4', true FROM "Problem" WHERE title='House Robber';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
2 7 9 3 1', '12', true FROM "Problem" WHERE title='House Robber';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1
10', '10', false FROM "Problem" WHERE title='House Robber';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '6
2 1 1 2 10 2', '13', false FROM "Problem" WHERE title='House Robber';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '6
5 5 10 100 10 5', '110', false FROM "Problem" WHERE title='House Robber';

-- Coin Change
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
1 2 5
11', '3', true FROM "Problem" WHERE title='Coin Change';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1
2
3', '-1', true FROM "Problem" WHERE title='Coin Change';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3
2 5 10
0', '0', false FROM "Problem" WHERE title='Coin Change';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4
1 3 4 5
7', '2', false FROM "Problem" WHERE title='Coin Change';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2
7 10
14', '2', false FROM "Problem" WHERE title='Coin Change';

-- LIS
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '8
10 9 2 5 3 7 101 18', '4', true FROM "Problem" WHERE title='LIS';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '6
0 1 0 3 2 3', '4', true FROM "Problem" WHERE title='LIS';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5
7 7 7 7 7', '1', false FROM "Problem" WHERE title='LIS';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1
42', '1', false FROM "Problem" WHERE title='LIS';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '7
1 2 3 4 5 6 7', '7', false FROM "Problem" WHERE title='LIS';

-- Edit Distance
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'horse
ros', '3', true FROM "Problem" WHERE title='Edit Distance';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'intention
execution', '5', true FROM "Problem" WHERE title='Edit Distance';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'abc
abc', '0', false FROM "Problem" WHERE title='Edit Distance';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '
abc', '3', false FROM "Problem" WHERE title='Edit Distance';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'kitten
sitting', '3', false FROM "Problem" WHERE title='Edit Distance';

-- ===================== GRAPHS =====================
-- (Same testcases you had earlier; kept compact)

-- Number of Islands
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4 5
11000
11000
00100
00011', '3', true FROM "Problem" WHERE title='Number of Islands';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 2
00
00', '0', true FROM "Problem" WHERE title='Number of Islands';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 1
1', '1', false FROM "Problem" WHERE title='Number of Islands';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 3
111
010
111', '1', false FROM "Problem" WHERE title='Number of Islands';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 3
101
010', '3', false FROM "Problem" WHERE title='Number of Islands';

-- Course Schedule
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 1
1 0', 'true', true FROM "Problem" WHERE title='Course Schedule';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 2
1 0
0 1', 'false', true FROM "Problem" WHERE title='Course Schedule';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4 3
1 0
2 1
3 2', 'true', false FROM "Problem" WHERE title='Course Schedule';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 3
0 1
1 2
2 0', 'false', false FROM "Problem" WHERE title='Course Schedule';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5 0', 'true', false FROM "Problem" WHERE title='Course Schedule';

-- Clone Graph (normalized edges)
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4 4
1 2
2 3
3 4
4 1', '1 2|1 4|2 3|3 4', true FROM "Problem" WHERE title='Clone Graph';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 2
1 2
2 3', '1 2|2 3', true FROM "Problem" WHERE title='Clone Graph';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5 0', '', false FROM "Problem" WHERE title='Clone Graph';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 1
1 2', '1 2', false FROM "Problem" WHERE title='Clone Graph';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '6 5
1 2
2 3
3 1
4 5
5 6', '1 2|1 3|2 3|4 5|5 6', false FROM "Problem" WHERE title='Clone Graph';

-- Network Delay
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4 3 2
2 1 1
2 3 1
3 4 1', '2', true FROM "Problem" WHERE title='Network Delay';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 1 1
1 2 1', '1', true FROM "Problem" WHERE title='Network Delay';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 0 1', '-1', false FROM "Problem" WHERE title='Network Delay';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 3 1
1 2 4
1 3 2
3 2 1', '3', false FROM "Problem" WHERE title='Network Delay';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 1 2
2 3 5', '-1', false FROM "Problem" WHERE title='Network Delay';

-- Word Ladder
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'hit cog
6
hot
dot
dog
lot
log
cog', '5', true FROM "Problem" WHERE title='Word Ladder';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'hit cog
5
hot
dot
dog
lot
log', '0', true FROM "Problem" WHERE title='Word Ladder';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'a c
3
a
b
c', '2', false FROM "Problem" WHERE title='Word Ladder';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'lost cost
6
most
mist
lost
fist
fish
cost', '2', false FROM "Problem" WHERE title='Word Ladder';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, 'game thee
7
gave
gale
tale
tele
thee
came
same', '0', false FROM "Problem" WHERE title='Word Ladder';

-- ===================== TREES =====================

-- Max Depth
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 9 20 null null 15 7', '3', true FROM "Problem" WHERE title='Max Depth';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 null 2 null 3', '3', true FROM "Problem" WHERE title='Max Depth';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1', '1', false FROM "Problem" WHERE title='Max Depth';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '', '0', false FROM "Problem" WHERE title='Max Depth';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 2 3 4 5 null null', '3', false FROM "Problem" WHERE title='Max Depth';

-- Same Tree
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 2 3
1 2 3', 'true', true FROM "Problem" WHERE title='Same Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 2
1 null 2', 'false', true FROM "Problem" WHERE title='Same Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '
', 'true', false FROM "Problem" WHERE title='Same Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 2 3 null 4
1 2 3 null 5', 'false', false FROM "Problem" WHERE title='Same Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '5 1 4 null null 3 6
5 1 4 null null 3 6', 'true', false FROM "Problem" WHERE title='Same Tree';

-- Invert Tree
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '4 2 7 1 3 6 9', '4 7 2 9 6 3 1', true FROM "Problem" WHERE title='Invert Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '2 1 3', '2 3 1', true FROM "Problem" WHERE title='Invert Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1', '1', false FROM "Problem" WHERE title='Invert Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '', '', false FROM "Problem" WHERE title='Invert Tree';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 null 2 null 3', '1 2 null 3', false FROM "Problem" WHERE title='Invert Tree';

-- Level Order
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 9 20 null null 15 7', '3|9 20|15 7', true FROM "Problem" WHERE title='Level Order';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1', '1', true FROM "Problem" WHERE title='Level Order';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '', '', false FROM "Problem" WHERE title='Level Order';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 2 3 4 5 6 7', '1|2 3|4 5 6 7', false FROM "Problem" WHERE title='Level Order';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 null 2 null 3 null 4', '1|2|3|4', false FROM "Problem" WHERE title='Level Order';

-- LCA
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 5 1 6 2 0 8 null null 7 4
5 1', '3', true FROM "Problem" WHERE title='LCA';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '3 5 1 6 2 0 8 null null 7 4
5 4', '5', true FROM "Problem" WHERE title='LCA';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 2 3
2 3', '1', false FROM "Problem" WHERE title='LCA';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '1 null 2 null 3 null 4
3 4', '3', false FROM "Problem" WHERE title='LCA';
INSERT INTO "Testcase" ("id","problemId","input","expected","isSample")
SELECT gen_random_uuid(), id, '10 5 15 3 7 12 18
3 7', '5', false FROM "Problem" WHERE title='LCA';

COMMIT;
