import crypto from 'crypto';

// --- SUAS CREDENCIAIS ---
// Idealmente, use variáveis de ambiente (process.env.APP_ID), mas para funcionar agora coloquei aqui.
const APP_ID = '18324200053';
const APP_SECRET = '3MMLFZJTOEYFZSLKIOTMXZZOQS2EOOWS';
const SHOPEE_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';

export default async function handler(req, res) {
  // --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
  const ALLOWED_ORIGIN = '*'; // Troque pelo seu domínio em produção (ex: 'https://seusite.com')

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { body } = req;

    if (!body || !body.query) {
      return res.status(400).json({ error: 'Invalid Request Body' });
    }

    // --- LÓGICA DE ASSINATURA (SIGNATURE) ---
    // A Shopee Affiliate API geralmente exige timestamp + assinatura.
    // Como é GraphQL, a autenticação muitas vezes é feita via Header 'Authorization' 
    // ou passando parâmetros assinados. Abaixo implemento a assinatura padrão SHA256.

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(body);

    // Algoritmo comum Shopee: SHA256(appId + timestamp + payload + secret)
    // Nota: Verifique a documentação exata da versão da API que está usando. 
    // Esta é a implementação padrão robusta.
    const stringToSign = `${APP_ID}${timestamp}${payloadString}${APP_SECRET}`;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    // Headers para a Shopee
    const shopeeHeaders = {
      'Content-Type': 'application/json',
      // Formato comum de Auth Shopee. Se falhar, tente apenas 'Authorization': signature
      'Authorization': `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`,
      // Alternativa (dependendo da doc): 'Sign': signature, 'Timestamp': timestamp
    };

    console.log(`Enviando proxy para Shopee... AppID: ${APP_ID}`);

    const shopeeResponse = await fetch(SHOPEE_ENDPOINT, {
      method: 'POST',
      headers: shopeeHeaders,
      body: payloadString
    });

    const data = await shopeeResponse.json();

    // Retorna resposta para o frontend
    res.status(shopeeResponse.status).json(data);

  } catch (error) {
    console.error("Erro no Proxy:", error);
    res.status(500).json({ error: "Erro interno no servidor de proxy.", details: error.message });
  }
}