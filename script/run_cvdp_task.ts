#!/usr/bin/env node

import fs from "fs/promises"
import path from "path"

import { Session } from "../packages/opencode/src/session/index.js"
import { prompt as runPrompt } from "../packages/opencode/src/session/prompt.js"
import { Provider } from "../packages/opencode/src/provider/provider.js"
import { Instance } from "../packages/opencode/src/project/instance.js"

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

const workspace = getArg("--workspace")
const promptFile = getArg("--prompt-file")
const modelArg = getArg("--model") || "gemini-2.5-flash"
const agent = getArg("--agent") || "build"

if (!workspace || !promptFile) {
  console.error("Missing required arguments --workspace or --prompt-file")
  process.exit(1)
}

async function main() {
  const workspacePath = path.resolve(workspace)
  const promptPath = path.resolve(promptFile)

  console.log("[OpenCode] Workspace:", workspacePath)
  console.log("[OpenCode] Prompt file:", promptPath)

  const promptText = await fs.readFile(promptPath, "utf8")

  try {
    Instance.directory = workspacePath
    Instance.worktree = workspacePath
    console.log("[OpenCode] Instance set to workspace")
  } catch (err) {
    console.warn("[OpenCode] Could not set Instance directly:", err)
  }

  const session = await Session.create({})
  console.log("[OpenCode] Session created:", session.id)

  let model: any
  try {
    model = Provider.parseModel
      ? Provider.parseModel(modelArg)
      : { modelID: modelArg }
  } catch {
    model = { modelID: modelArg }
  }

  console.log("[OpenCode] Starting agent loop...")

  const result = await runPrompt({
    sessionID: session.id,
    agent,
    model,
    parts: [
      {
        type: "text",
        text: promptText,
      },
    ],
  })

  console.log("[OpenCode] Agent loop finished")

  console.log(
    JSON.stringify({
      status: "completed",
      session_id: session.id,
      message_id: result?.info?.id ?? null,
    })
  )
}

main().catch((err) => {
  console.error("[OpenCode] ERROR:", err)
  console.log(
    JSON.stringify({
      status: "error",
      error: String(err),
    })
  )
  process.exit(1)
})