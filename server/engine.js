import { randomUUID } from "node:crypto";

export class ValidationError extends Error {}
export function validateRun(body) {
  const fail = (message) => {
    throw new ValidationError(message);
  };
  if (!body || !["demo", "live"].includes(body.mode))
    fail("请选择有效运行模式。");
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.length > 100
  )
    fail("实验名称需为 1–100 个字符。");
  if (
    !Array.isArray(body.prompts) ||
    body.prompts.length !== 2 ||
    body.prompts.some(
      (p) => typeof p !== "string" || !p.trim() || p.length > 12000,
    )
  )
    fail("请填写两版提示词，每版不超过 12000 字符。");
  if (
    !Array.isArray(body.cases) ||
    body.cases.length < 1 ||
    body.cases.length > 12
  )
    fail("测试集需要 1–12 条用例。");
  for (const c of body.cases) {
    if (
      !c ||
      typeof c.input !== "string" ||
      !c.input.trim() ||
      c.input.length > 4000
    )
      fail("每条用例需填写 1–4000 字符的输入。");
    if (
      typeof c.keyword !== "string" ||
      c.keyword.length > 200 ||
      typeof c.json !== "boolean"
    )
      fail("检查规则格式不正确。");
  }
  return {
    name: body.name.trim(),
    mode: body.mode,
    prompts: [...body.prompts],
    cases: body.cases.map((c) => ({
      input: c.input,
      keyword: c.keyword.trim(),
      json: c.json,
    })),
  };
}

export function renderPrompt(template, input) {
  return template.includes("{{input}}")
    ? template.replaceAll("{{input}}", () => input)
    : `${template}\n\n${input}`;
}

export function checkOutput(output, testCase) {
  const checks = [];
  if (testCase.keyword)
    checks.push({
      name: `包含「${testCase.keyword}」`,
      passed: output
        .toLocaleLowerCase()
        .includes(testCase.keyword.toLocaleLowerCase()),
    });
  if (testCase.json) {
    let passed = true;
    try {
      JSON.parse(output);
    } catch {
      passed = false;
    }
    checks.push({ name: "有效 JSON", passed });
  }
  return checks;
}

function demoResponse(input, variant) {
  // Fixtures intentionally ignore prompt edits: they demonstrate the workbench, not model inference.
  return variant === 0
    ? `这段反馈表达了用户的使用体验：${input}\n整体需要结合上下文判断，建议继续关注。`
    : JSON.stringify(
        {
          sentiment: /慢|差|闪退|贵|失败|糟|卡/.test(input)
            ? "negative"
            : /好|棒|喜欢|快|满意/.test(input)
              ? "positive"
              : "neutral",
          summary: input.slice(0, 80),
          action: "记录反馈并跟进用户体验",
        },
        null,
        2,
      );
}

async function requestModel(prompt, config, fetcher) {
  const response = await fetcher(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(45000),
    },
  );
  if (!response.ok)
    throw new Error(
      `模型接口返回 HTTP ${response.status}。请检查服务端配置或配额。`,
    );
  const data = await response.json();
  const output = data.choices?.[0]?.message?.content;
  if (typeof output !== "string") throw new Error("模型接口没有返回文本回答。");
  return {
    output,
    tokens: Number.isFinite(data.usage?.total_tokens)
      ? data.usage.total_tokens
      : null,
  };
}

export async function evaluateRun(body, config = {}, fetcher = fetch) {
  const input = validateRun(body);
  if (
    input.mode === "live" &&
    (!config.apiKey || !config.baseUrl || !config.model)
  )
    throw new ValidationError("请先在服务端 .env 中配置模型地址、密钥和名称。");
  const run = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model: input.mode === "demo" ? "Offline fixtures" : config.model,
    results: [],
  };
  const jobs = input.cases.flatMap((c, caseIndex) =>
    [0, 1].map((variant) => ({ c, caseIndex, variant })),
  );
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const { c, caseIndex, variant } = jobs[cursor++];
      const start = performance.now();
      try {
        let answer;
        if (input.mode === "demo") {
          await new Promise((resolve) => setTimeout(resolve, 100));
          answer = { output: demoResponse(c.input, variant), tokens: null };
        } else
          answer = await requestModel(
            renderPrompt(input.prompts[variant], c.input),
            config,
            fetcher,
          );
        run.results.push({
          caseIndex,
          variant,
          ...answer,
          latencyMs: Math.round(performance.now() - start),
          checks: checkOutput(answer.output, c),
          error: null,
        });
      } catch (error) {
        const message = ["TimeoutError", "AbortError"].includes(error.name)
          ? "请求超时（45 秒），可重试。"
          : error.message?.startsWith("模型接口")
            ? error.message
            : "无法连接模型服务，请检查服务端网络与接口配置。";
        run.results.push({
          caseIndex,
          variant,
          output: "",
          tokens: null,
          latencyMs: Math.round(performance.now() - start),
          checks: [],
          error: message,
        });
      }
    }
  }
  await Promise.all([worker(), worker()]);
  run.results.sort(
    (a, b) => a.caseIndex - b.caseIndex || a.variant - b.variant,
  );
  return run;
}
