// Cloudflare Pages Function — route /api/vessels
// Réutilise la logique du Worker (worker/vessels.js) via un wrapper Pages Functions.
import worker from '../../worker/vessels.js';

export async function onRequestGet(context) {
  return worker.fetch(context.request);
}

// Gérer OPTIONS (CORS preflight)
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
