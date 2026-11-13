---
description: Use the CodeFusion Studio documentation and cfsutil skills in GitHub Copilot, Claude Code, OpenAI Codex, and other supported AI agents
author: Analog Devices
date: 2026-11-03
---

# AI-Assisted Development Skills

CodeFusion Studio (CFS) provides skills that help your AI assistant answer questions about CFS, use the `cfsutil` command-line utility, and evaluate AI models on ADI hardware:

- **`cfs-docs`** — answers questions about installing, setting up, using, and troubleshooting CodeFusion Studio by reading the relevant documentation.
- **`cfs-cli`** — provides guidance on the `cfsutil` command-line utility, including code generation, workspace and project management, package installation, ELF analysis, and AI model workflows.
- **`cfs-workspace-bootstrap`** — resolves a SoC target and template, creates or assesses a CFS workspace, checks its development packages and configuration, and optionally runs its first build.
- **`cfs-ai-evaluation`** — runs an end-to-end AI model evaluation on ADI silicon. It starts from model import and workspace creation, moves through build, flash, and inference, then returns a structured evidence bundle. If the **Zephyr Single Core TensorFlow AI Inference Profiling** template is available for your target and its Zephyr package includes Zephelin (`modules/zephelin`), the skill uses it to capture inference traces, including per-layer timing. If not, it falls back to the standard AI-enabled TensorFlow Lite for Microcontrollers (TFLM) template, which confirms that inference runs but returns limited results. In CodeFusion Studio 2.4.0, MAX32657 uses this fallback because the AI inference profiling template is not available for it.
- **`cfs-ai-report`** — turns an evaluation evidence bundle into an engineering report, correlating static estimates with measured on-silicon behavior to identify bottlenecks and recommend optimizations.

!!! note "Before you use the AI evaluation skills"
    `cfs-ai-evaluation` builds firmware and flashes it to a board. Before you start:

    - Install CFS 2.4.0 or later.
    - Install Python 3 and make sure it is on your `PATH`. The skill's scripts use only the Python standard library, so no extra packages are required.
    - Connect your board and its debug probe to your computer. See [Connect hardware](../debugging/connect-hardware.md) for cabling details.

    The evaluation replaces the firmware on the board. `cfs-ai-report` only reads an existing evaluation and does not need a board.

The skills follow the open Agent Skills standard, so they work across GitHub Copilot, Claude Code, OpenAI Codex, and other supported agents. Install them as described in the following sections.

## Access in GitHub Copilot

Once the CFS VS Code extension is installed, the skills are available in GitHub Copilot Chat — no separate installation is required.

!!! note
    Using the skills in Copilot requires **VS Code 1.109 or later**. On earlier versions the extension still installs, but the skills are not available in Copilot Chat. Update VS Code to use them.

1. Install the [:octicons-link-external-24: GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot){:target="_blank"}.
2. Open GitHub Copilot Chat (`Ctrl+Alt+I` / `Cmd+Shift+I`).
3. Ask a CodeFusion Studio question — for example, *"How do I create a new workspace in CFS?"* for product documentation, or a CLI question like *"How do I list tasks for a workspace?"* Copilot uses the relevant skill to answer.

![GitHub Copilot Chat answering a CodeFusion Studio question using the cfs-cli skill](images/cfs-skills-dark.png#only-dark)
![GitHub Copilot Chat answering a CodeFusion Studio question using the cfs-cli skill](images/cfs-skills-light.png#only-light)

## Access in Claude Code

For Claude Code, install the skills as a plugin from the CodeFusion Studio marketplace:

```text
/plugin marketplace add analogdevicesinc/codefusion-studio
/plugin install cfs-skills@adi-codefusion-studio
```

!!! note "Windows: `Filename too long` error"
    If adding the marketplace fails with `Filename too long`, turn on long path support in Git, then run `/plugin marketplace add` again. You can ignore any `Permission denied (publickey)` error that follows.

    ```sh
    git config --global core.longpaths true
    ```

Once installed, invoke the skills with:

- `/cfs-docs` (or `/cfs-skills:cfs-docs` when installed through the plugin) for product documentation questions.
- `/cfs-cli` (or `/cfs-skills:cfs-cli`) for CLI command reference.
- `/cfs-workspace-bootstrap` (or `/cfs-skills:cfs-workspace-bootstrap`) for workspace setup, SDK readiness, and first-build verification.
- `/cfs-ai-evaluation` (or `/cfs-skills:cfs-ai-evaluation`) for running an AI model import to evaluation on ADI silicon and related workflow steps.
- `/cfs-ai-report` (or `/cfs-skills:cfs-ai-report`) to generate in-depth analysis report for AI end-to-end evaluation report.

## Access in other assistants

The skills follow the open [:octicons-link-external-24: Agent Skills](https://agentskills.io){:target="_blank"} standard and work in compatible agents such as OpenAI Codex and Cursor. Use this command to detect installed agents and add the skills to each:

```sh
npx skills add https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cfs-skills
```

Invoke the skills using the method supported by your assistant.

## Update the skills

!!! warning
    Claude Code and `npx skills` install the skills for the latest CFS release. If you stay on an earlier release, don't update the skills or turn on auto-update, because the latest skills might describe commands that your release doesn't have.

New CodeFusion Studio releases can add skills and update existing ones. How you get the latest skills depends on how you installed them:

- **GitHub Copilot** — the skills are bundled with the CFS VS Code extension. Update the extension to update the skills.
- **Claude Code** — turn on auto-update for the `adi-codefusion-studio` marketplace, which is off by default. Enter `/plugin`, select the **Marketplaces** tab, select **adi-codefusion-studio**, and then select **Enable auto-update**.

    ![Claude Code plugin Marketplaces tab for adi-codefusion-studio with the Update marketplace and Enable auto-update options](images/claude-code-marketplace-update-options-dark.png#only-dark)
    ![Claude Code plugin Marketplaces tab for adi-codefusion-studio with the Update marketplace and Enable auto-update options](images/claude-code-marketplace-update-options-light.png#only-light)

    If auto-update is off, select **Update marketplace** on the same screen to update the skills manually. Alternatively, run these commands from a terminal:

    ```sh
    claude plugin marketplace update adi-codefusion-studio
    claude plugin update cfs-skills@adi-codefusion-studio
    ```

    If Claude Code is already running, run `/reload-plugins` or restart it to load the updated skills.

    For details, see [:octicons-link-external-24: Turn auto-update on or off for a marketplace](https://code.claude.com/docs/en/discover-plugins#turn-auto-update-on-or-off-for-a-marketplace){:target="_blank"} in the Claude Code documentation.

- **Other assistants** — run the `npx skills add` command from [Access in other assistants](#access-in-other-assistants) again to install the latest version of every skill, including new ones.
