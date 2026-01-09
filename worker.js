import HTML_CONTENT from './index.html';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path.startsWith('/api/')) {
      return handleAPI(request, env, corsHeaders);
    }

    return new Response(HTML_CONTENT, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });
  },
};

async function handleAPI(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === '/api/data' && request.method === 'GET') {
      const key = url.searchParams.get('key');

      if (!key || key.length < 32) {
        return jsonResponse({ error: 'Invalid key' }, 400, corsHeaders);
      }

      const data = await env.DATA_KV.get(key);

      if (data === null) {
        return jsonResponse({ exists: false, data: null }, 200, corsHeaders);
      }

      return jsonResponse({ exists: true, data: data }, 200, corsHeaders);
    }

    if (path === '/api/data' && request.method === 'PUT') {
      const body = await request.json();
      const { key, data, salt } = body;

      if (!key || key.length < 32) {
        return jsonResponse({ error: 'Invalid key' }, 400, corsHeaders);
      }

      if (!data) {
        return jsonResponse({ error: 'Missing data' }, 400, corsHeaders);
      }

      const stored = JSON.stringify({
        encryptedData: data,
        salt: salt,
        updatedAt: Date.now(),
      });

      await env.DATA_KV.put(key, stored);

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    if (path === '/api/data' && request.method === 'DELETE') {
      const key = url.searchParams.get('key');

      if (!key) {
        return jsonResponse({ error: 'Missing key' }, 400, corsHeaders);
      }

      await env.DATA_KV.delete(key);
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: 'Internal error' }, 500, corsHeaders);
  }
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
