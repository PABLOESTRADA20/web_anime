export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public backend: string,
    public cause?: Error,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class AllProvidersFailedError extends Error {
  constructor(
    public errors: ProviderError[],
    public anilistId?: number | string,
    public epNum?: number,
  ) {
    const msgs = errors.map((e) => `[${e.provider}] ${e.message}`).join('; ')
    super(`Todos los proveedores fallaron: ${msgs}`)
    this.name = 'AllProvidersFailedError'
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, backend: string, timeout: number) {
    super(`Timeout después de ${timeout}ms`, provider, backend)
    this.name = 'ProviderTimeoutError'
  }
}

export class ProviderHealthError extends ProviderError {
  constructor(provider: string, backend: string) {
    super(`Health check falló`, provider, backend)
    this.name = 'ProviderHealthError'
  }
}
