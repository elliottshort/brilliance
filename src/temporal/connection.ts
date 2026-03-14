import type { ConnectionOptions } from '@temporalio/client'
import type { NativeConnectionOptions } from '@temporalio/worker'

export const TASK_QUEUE = 'course-generation'

export function getConnectionOptions(): ConnectionOptions {
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233'
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default'
  const apiKey = process.env.TEMPORAL_API_KEY

  const options: ConnectionOptions = { address }

  if (apiKey) {
    options.apiKey = apiKey
    options.metadata = { 'temporal-namespace': namespace }
    options.tls = true
  }

  return options
}

export function getNativeConnectionOptions(): NativeConnectionOptions {
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233'
  const apiKey = process.env.TEMPORAL_API_KEY

  const options: NativeConnectionOptions = { address }

  if (apiKey) {
    options.apiKey = apiKey
    options.tls = true
  }

  return options
}

export function getNamespace(): string {
  return process.env.TEMPORAL_NAMESPACE ?? 'default'
}
