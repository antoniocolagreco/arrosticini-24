import { fileURLToPath } from 'node:url'

export default {
  server: {
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
}
