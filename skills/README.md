# 考研英语精析教练

A standalone Chinese-language study skill for postgraduate entrance examination English. Covers cloze tests, reading comprehension, essay revision, and retrieval-based review. This is a companion resource; PromptLens does not automatically load or execute it.

## 从具体问题开始

- 完形：两个选项都能搭配，究竟依据哪个词、哪句话区分？
- 阅读：每句都懂，为什么推不出前后关系？选项改变了原文的哪个条件？
- 作文：先检查题目要点，再区分必须纠正的错误和可选优化。
- 复习：从闭卷重建依据到新语境、延迟练习，避免只记答案字母。

入口：[SKILL.md](kaoyan-english-coach/SKILL.md)。

## 使用

复制 `kaoyan-english-coach` 文件夹到你的技能目录，并在支持本地技能的工具中加载。默认 Codex 用户技能目录通常为 `~/.codex/skills`；自定义环境以实际配置为准。

调用示例：

```text
使用 $kaoyan-english-coach 讲解这篇完形，重点比较我犹豫的两项。
请给出原文证据、选项分别表达的命题，以及下一次可以执行的检查动作。
```

若只需要一份普通对话指令，复制 [chatgpt-study-instructions.md](kaoyan-english-coach/assets/chatgpt-study-instructions.md) 的教学指令部分，然后提供题目、选项与自己的思路。无需运行 PromptLens，也无需设置模型 API Key。

## 文件与依据

| 文件 | 用途 |
| --- | --- |
| `SKILL.md` | 任务选择、证据约束、输出与记录边界 |
| `references/cloze.md` | 完形选项比较与逻辑层次 |
| `references/reading.md` | 阅读命题、证据与推断 |
| `references/writing.md` | 作文审题、最小修改与改进 |
| `references/practice.md` | 迁移练习与可调整的复习流程 |
| `references/evidence.md` | 已核查研究来源和适用限制 |
| `references/acceptance-cases.md` | 9 组原创行为验收场景 |
| `assets/chatgpt-study-instructions.md` | 可复制的完整对话学习指令 |
| `agents/openai.yaml` | 技能显示名称与示例调用 |

研究来源包括 Dunlosky 等（2013）的学习技术综述、Karpicke 与 Blunt（2011）的提取练习实验，以及 IES/WWC（2007）的学习实践指南；链接与本次核查范围见 [研究依据](kaoyan-english-coach/references/evidence.md)。

这些研究支持通用训练原则，不验证本技能在考研场景中的效果，不保证提分。复习间隔是可调整起点，不是普适最优日程；评分是学习性反馈，不是官方阅卷。

## 验证与贡献

已经检查技能结构、中文编码和本地引用文件。行为案例用于后续实际运行评估，不能视为已通过独立模型评测或学习效果实验。

改动时用验收案例实际生成回答，检查是否出现编原文、把多解判唯一、固守错误诊断或忽视用户带练/详解选择等问题。新增案例使用原创或许可允许的材料，勿提交个人对话、真实考生信息、私人画像或未授权讲义。

本公开版不含个人学习档案、原聊天或原讲稿。适用仓库根目录的 MIT 许可证。
