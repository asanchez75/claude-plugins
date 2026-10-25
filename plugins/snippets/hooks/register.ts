/**
 * Snippets - expand #hashtag snippets in user input, with #-autocomplete.
 * Port of ~/.pi/agent/extensions/snippets.ts. Edit SNIPPETS; the mod hot-reloads.
 */

import type { Register } from 'claude-code'

interface Snippet {
  name: string;
  aliases?: string[];
  description?: string;
  content: string;
}

const SNIPPETS: Snippet[] = [
  {
    name: "uv",
    aliases: ["uv"],
    description: "It provides uv information",
    content: "you could use uv with VIRTUAL_ENV=/home/$USER/.venvs/uness uv run --sync [SCRIPTNAME]",
  },
  {
    name: "premortem",
    aliases: ["premortem"],
    description: "premortem analysis",
    content: "perform an epistemic premortem analysis using formal counterfactual reasoning to consider the consequences of following your suggestion.",
  },
  {
    name: "blogpost",
    aliases: ["blogpost"],
    description: "write a medium-style blogspot",
    content: "write an article in clear prose for the Medium.com platform. Avoid telegraphic sentences. The text must be self-contained. AI-sounding sentences and wording removed",
  },
  {
    name: "datastorytelling",
    aliases: ["datastorytelling"],
    description: "write a datastorytelling",
    content: "provide a data storytelling walkthrough as if it were a manual processing task, include intermediate inputs/outputs",
  },
  {
    name: "defensible",
    aliases: ["defensible"],
    description: "Recover as much of the text's quality as possible ",
    content: "select the most defensible cases and develop the strongest possible argument for each one",
    },
  {
    name: "evidence",
    aliases: ["evidence"],
    description: "Show me raw evidence",
    content: "show me the raw evidence for each of your claims. Identify any assumptions you have made and explain what you cannot verify",
    },
  {
    name: "falsification",
    aliases: ["epistemic"],
    description: "epistemic falsification",
    content: "epistemically audit your answer: (1) Fix definitions strictly to avoid semantic ambiguity; (2) State the core claim alongside its necessary auxiliary assumptions; (3) Define the operational domain where it holds; (4) Identify the specific empirical or systemic conditions under which the core claim is definitively falsified.",
    },
  {
    name: "tldr",
    aliases: ["tldr"],
    description: "tl;dr",
    content: "provide a TL;DR summary of your answer in plain text for a project manager.",
    },
  {
    name: "cognitive_bridge",
    aliases: ["cognitive_bridge"],
    description: "cognitive bridge",
    content: "what cognitive or epistemic bridge would a senior scientist use to spot the problem between X and Y?",
    },
  {
    name: "cognitive_bias",
    aliases: ["cognitive_bias"],
    description: "cognitive bias",
    content: "identify the cognitive biases that influenced your response and refine its epistemological quality.",
    },
  {
    name: "dsl",
    aliases: ["dsl"],
    description: "dsl",
    content: "show me the latent DSL (Domain-Specific language) for this text",
    },
  {
    name: "traceability",
    aliases: ["traceability"],
    description: "traceability",
    content: "follow every claim back to the measurement that produced it, and treat whatever resists tracing as the signal itself",
    },
  {
    name: "claude",
    aliases: ["claude"],
    description: "claude code",
    content: "use command ```claude -p \"[TASK]\" ---allowed-tools Read,Write``` to ask for a second opinion for solving the problem",
    },
  {
    name: "codex",
    aliases: ["codex"],
    description: "codex",
    content: "use command ```codex exec  --skip-git-repo-check \"[TASK]\"``` to ask for a second opinion for solving the problem",
    },
  {
    name: "tmux_pane",
    aliases: ["tmux_pane"],
    description: "launch an operation in a tmux pane",
    content: "use another tmux pane to evaluate the output: a) tmux send-keys -t [SESSION:WINDOW.PANE] \"pi --provider litellm --model openai/Inferact/Qwen3.8-27B-NVFP4 --thinking off -p \"[TASK]\" Enter , b) tmux capture-pane -p -t [SESSION:WINDOW.PANE] -S -[SCROLLBALL_LINES]",
    },
  {
    name: "pi-link",
    aliases: ["pi-link"],
    description: "launch an operation in a tmux pane",
    content: "use tmux send-keys -t [SESSION:WINDOW.PANE] \"pi --link-name slave\" Enter, to start a new pi agent and next, use link_send to ask to \"slave\" to perform this [TASK]",
    },
  {
    name: "dead_code",
    aliases: ["dead-code"],
    description: "dead-code",
    content: "remove associated dead code, leftovers, orphan code and landmines",
     },
  {
    name: "confirm",
    aliases: ["confirm"],
    description: "Confirm understanding",
    content: "confirm you understand, no coding yet. Wait for further instructions.",
     },
  {
    name: "playwright",
    aliases: ["playwright"],
    description: "Use playwright headed vnc skill",
    content: "use the skill playwright-headed-vnc",
     },
  {
    name: "spurious_rigor",
    aliases: ["spurious_rigor"],
    description: "spurious_rigor",
    content: "detect outcome biases like unfaithful Post-Hoc Rationalization, Spurious Rigor / Mathiness, Cargo Cult Reasoning, Framework-Forcing / Sycophancy and Formal Confabulation, Automation bias.",
    }
];

const MAX_EXPANSIONS = 25;
const HASHTAG = /#([a-z0-9\-_]+)/gi;

const registry = new Map<string, Snippet>();
for (const s of SNIPPETS) {
  registry.set(s.name.toLowerCase(), s);
  for (const a of s.aliases ?? []) registry.set(a.toLowerCase(), s);
}

interface Expanded {
  text: string;
  prepend: string[];
  append: string[];
}

function extractBlocks(content: string): { inline: string; prepend: string[]; append: string[] } {
  const prepend: string[] = [];
  const append: string[] = [];
  // Unclosed block runs to the end of the content; a stray closing tag stays inline.
  const inline = content.replace(/<(prepend|append)>([\s\S]*?)(?:<\/\1>|$)/gi, (_m, tag: string, body: string) => {
    const trimmed = body.trim();
    if (trimmed) (tag.toLowerCase() === "prepend" ? prepend : append).push(trimmed);
    return "";
  });
  return { inline: inline.trim(), prepend, append };
}

export function expand(text: string, counts: Map<string, number>): Expanded {
  const prepend: string[] = [];
  const append: string[] = [];
  let out = text;
  let previous: string;
  let loop = false;

  do {
    previous = out;
    out = out.replace(HASHTAG, (match, name: string) => {
      const key = name.toLowerCase();
      const snippet = registry.get(key);
      if (!snippet) return match;

      const count = (counts.get(key) ?? 0) + 1;
      if (count > MAX_EXPANSIONS) {
        loop = true;
        return match;
      }
      counts.set(key, count);

      const blocks = extractBlocks(snippet.content);
      for (const [list, dest] of [
        [blocks.prepend, prepend],
        [blocks.append, append],
      ] as const) {
        for (const block of list) {
          const r = expand(block, counts);
          dest.push(r.text);
          prepend.push(...r.prepend);
          append.push(...r.append);
        }
      }
      const nested = expand(blocks.inline, counts);
      prepend.push(...nested.prepend);
      append.push(...nested.append);
      return nested.text;
    });
  } while (out !== previous && !loop);

  return { text: out, prepend, append };
}

export function expandAll(text: string): string {
  const r = expand(text, new Map())
  return [r.prepend.join('\n\n'), r.text.trim() ? r.text : '', r.append.join('\n\n')].filter(Boolean).join('\n\n')
}

export const register: Register = (on) => {
  on('prompt.autocomplete', { token: /^#/ }, async ($, e, next) => {
    const query = e.token.slice(1).toLowerCase()
    if (!/^[a-z0-9_-]*$/.test(query)) return next(e)
    const mine = SNIPPETS.filter(
      (s) => !query || [s.name, ...(s.aliases ?? [])].some((n) => n.toLowerCase().includes(query)),
    )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => {
        const aliases = (s.aliases ?? []).filter((a) => a !== s.name).map((a) => `#${a}`).join(', ')
        const desc = s.description ?? (s.content.split("\n")[0] ?? "").slice(0, 60)
        return {
          text: expandAll(`#${s.name}`) || `#${s.name}`,
          label: `#${s.name}`,
          description: aliases ? `${desc}  [${aliases}]` : desc,
        }
      })
    const { suggestions } = await next(e)
    return { suggestions: [...suggestions, ...mine] }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || !e.text) return next(e)
    const text = expandAll(e.text)
    return text !== e.text ? next({ ...e, text }) : next(e)
  })
}
