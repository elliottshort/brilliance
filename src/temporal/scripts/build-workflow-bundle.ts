import { bundleWorkflowCode } from '@temporalio/worker'
import path from 'path'
import fs from 'fs'

async function main() {
  const workflowsPath = path.resolve(process.cwd(), 'src/temporal/workflows/course-generation.ts')

  const { code } = await bundleWorkflowCode({
    workflowsPath,
  })

  const outDir = path.resolve(process.cwd(), 'dist-worker')
  const bundlePath = path.join(outDir, 'workflow-bundle.js')

  fs.mkdirSync(path.dirname(bundlePath), { recursive: true })
  fs.writeFileSync(bundlePath, code)

  console.log(`Workflow bundle written to ${bundlePath}`)
}

main().catch((err) => {
  console.error('Failed to bundle workflows:', err)
  process.exit(1)
})
