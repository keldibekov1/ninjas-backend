export function findMostSuitableDescription(
  oldDataString: string,
  suggestedData: string[],
): string {
  let bestMatch = '';
  let bestMatchDistance = Number.MAX_SAFE_INTEGER;

  function levenshteinDistance(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
      Array.from({ length: b.length + 1 }, () => 0),
    );

    for (let i = 0; i <= a.length; i++) {
      for (let j = 0; j <= b.length; j++) {
        if (i === 0) {
          dp[i][j] = j;
        } else if (j === 0) {
          dp[i][j] = i;
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0),
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
          );
        }
      }
    }

    return dp[a.length][b.length];
  }

  for (const suggested of suggestedData) {
    const distance = levenshteinDistance(oldDataString, suggested);

    if (
      distance < bestMatchDistance ||
      (distance === bestMatchDistance && suggested.length > bestMatch.length)
    ) {
      bestMatch = suggested;
      bestMatchDistance = distance;
    }
  }

  return bestMatch;
}

export const isSimilar = (
  str1: string,
  str2: string,
  threshold: number = 0.5,
): boolean => {
  function longestCommonSubstring(s1: string, s2: string): string {
    const dp: number[][] = Array.from({ length: s1.length + 1 }, () =>
      Array.from({ length: s2.length + 1 }, () => 0),
    );
    let maxLength = 0;
    let endIndex = 0;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLength) {
            maxLength = dp[i][j];
            endIndex = i - 1;
          }
        } else {
          dp[i][j] = 0;
        }
      }
    }

    return s1.slice(endIndex - maxLength + 1, endIndex + 1);
  }

  function calculateSimilarity(s1: string, s2: string): number {
    const common = longestCommonSubstring(s1.toLowerCase(), s2.toLowerCase());
    const similarity = (2 * common.length) / (s1.length + s2.length);
    return similarity;
  }

  const similarity = calculateSimilarity(str1, str2);
  return similarity >= threshold;
};
