import { NativeConnection, Worker } from '@temporalio/worker'
import { getNativeConnectionOptions, getNamespace, TASK_QUEUE } from './connection'
import * as researchActivities from './activities/research'
import * as generationActivities from './activities/generation'
import * as persistenceActivities from './activities/persistence'
import * as verificationActivities from './activities/verification'
import path from 'path'
import fs from 'fs'

const activities = {
  ...researchActivities,
  ...generationActivities,
  ...persistenceActivities,
  ...verificationActivities,
}

async function run() {
  const connection = await NativeConnection.connect(getNativeConnectionOptions())

  const bundlePath = path.resolve(__dirname, '../../dist-worker/workflow-bundle.js')
  const useBundle = fs.existsSync(bundlePath)

  const workerOptions: Parameters<typeof Worker.create>[0] = {
    connection,
    namespace: getNamespace(),
    taskQueue: TASK_QUEUE,
    activities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 50,
    shutdownGraceTime: '30s',
  }

  if (useBundle) {
    workerOptions.workflowBundle = {
      codePath: bundlePath,
    }
  } else {
    workerOptions.workflowsPath = require.resolve('./workflows/course-generation')
  }

  const worker = await Worker.create(workerOptions)

  console.log(`Worker started, listening on task queue: ${TASK_QUEUE}`)

  const shutdown = async () => {
    console.log('Shutting down worker...')
    worker.shutdown()
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  await worker.run()
  console.log('Worker shut down gracefully')
}

run().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
