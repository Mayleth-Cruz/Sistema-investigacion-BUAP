import { vi } from 'vitest'

/**
 * Sustituye globalThis.fetch por un simulador de rutas.
 * `routes` es una lista de { method?, match (string|RegExp|fn), status?, body|respond }.
 * Devuelve el mock (con `.calls` útiles para aserciones).
 */
export function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

export function mockFetch(routes = []) {
  const calls = []
  const impl = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const parsedBody = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : options.body
    calls.push({ url: String(url), method, body: parsedBody, headers: options.headers })

    for (const route of routes) {
      const rMethod = (route.method || 'GET').toUpperCase()
      if (rMethod !== method) continue
      const m = route.match
      const ok =
        typeof m === 'string' ? String(url).endsWith(m) || String(url).includes(m)
        : m instanceof RegExp ? m.test(String(url))
        : typeof m === 'function' ? m(String(url), options)
        : false
      if (!ok) continue
      if (route.error) throw new Error('network')
      if (route.respond) return route.respond({ url: String(url), method, body: parsedBody })
      return jsonResponse(route.body ?? { success: true, data: null }, route.status ?? 200)
    }
    return jsonResponse({ success: false, message: 'No encontrado' }, 404)
  })
  impl.calls = calls
  vi.stubGlobal('fetch', impl)
  return impl
}
