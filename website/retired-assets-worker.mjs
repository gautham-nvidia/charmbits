import { isWithheldArtworkFile } from '../release/artwork-policy.mjs';

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    // Removed files can survive in the static asset cache after a deployment.
    // Refuse the retired artwork before consulting that cache.
    if (path.startsWith('/assets/home-previews/') || isWithheldArtworkFile(path)) {
      return new Response('Not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
