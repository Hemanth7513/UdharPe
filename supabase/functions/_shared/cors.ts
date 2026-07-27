const allowedOrigins = [
  'https://udhar-pe.vercel.app',
  'http://localhost:5173'
];

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.join(', '),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
