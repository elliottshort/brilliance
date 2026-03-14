import { Connection, WorkflowClient } from '@temporalio/client'
import { getConnectionOptions, getNamespace } from './connection'

const globalForTemporal = globalThis as unknown as { temporalClient: WorkflowClient }

export async function getTemporalClient(): Promise<WorkflowClient> {
  if (globalForTemporal.temporalClient) {
    return globalForTemporal.temporalClient
  }

  const connection = await Connection.connect(getConnectionOptions())
  const client = new WorkflowClient({
    connection,
    namespace: getNamespace(),
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForTemporal.temporalClient = client
  }

  return client
}
