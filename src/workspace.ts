export type Case = { input: string; keyword: string; json: boolean };
export type Result = {
  caseIndex: number;
  variant: number;
  output: string;
  tokens: number | null;
  latencyMs: number;
  checks: { name: string; passed: boolean }[];
  error: string | null;
};
export type Run = {
  id: string;
  name: string;
  mode: "demo" | "live";
  model: string;
  createdAt: string;
  prompts: string[];
  cases: Case[];
  results: Result[];
};
export type Summary = Pick<Run, "id" | "name" | "mode" | "createdAt"> & {
  caseCount: number;
};
export const defaults = [
  "分析下面的用户反馈，判断情绪并给出建议。\n\n用户反馈：{{input}}",
  "你是产品反馈分析师。分析用户反馈，只输出有效 JSON，不要使用 Markdown。\n\n字段：sentiment（positive / negative / neutral）、summary（简短概括）、action（下一步行动）。\n\n用户反馈：{{input}}",
];
export const sampleCases: Case[] = [
  { input: "新版本加载很快，界面也好看，太喜欢了！", keyword: "", json: true },
  { input: "更新后一直闪退，工作都没法完成。", keyword: "", json: true },
  { input: "功能还可以，不过价格有点贵。", keyword: "", json: true },
];
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败，请重试。");
  return data;
}
export function exportRun(run: Run, format: "json" | "md") {
  const markdown = [
    `# ${run.name}`,
    `Mode: ${run.mode} | Model: ${run.model} | ${run.createdAt}`,
    run.mode === "demo"
      ? "> Offline fixtures: not model inference; latency is artificial; tokens are unavailable."
      : "> Rule checks do not measure factual accuracy.",
    ...run.prompts.map((p, i) => `## Prompt ${i ? "B" : "A"}\n\n${p}`),
    ...run.cases.flatMap((c, i) => [
      `## Case ${i + 1}\n\n${c.input}`,
      ...run.results
        .filter((r) => r.caseIndex === i)
        .map(
          (r) =>
            `### ${r.variant ? "B" : "A"}\n\n${r.error || r.output}\n\nChecks: ${r.checks.map((c) => `${c.passed ? "PASS" : "FAIL"} ${c.name}`).join("; ") || "None"}\n\nLatency: ${r.latencyMs} ms | Tokens: ${r.tokens ?? "N/A"}`,
        ),
    ]),
  ].join("\n\n");
  const blob = new Blob(
    [format === "json" ? JSON.stringify(run, null, 2) : markdown],
    {
      type:
        format === "json" ? "application/json" : "text/markdown;charset=utf-8",
    },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `promptlens-${run.id.slice(0, 8)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
