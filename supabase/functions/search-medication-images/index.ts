import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    console.log('API key exists:', !!braveApiKey);
    
    if (!braveApiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + " medication pill")}`;
    console.log('Searching:', searchUrl);

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey,
      },
    });

    console.log('Brave API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brave API error response:', errorText);
      throw new Error(`Brave API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
