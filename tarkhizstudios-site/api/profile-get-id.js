import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_ANON_KEY).'
    });
  }

  // 2. Captura do ID via Query String (GET) ou Body (POST)
  const id = req.query.id || req.body?.id || req.body?.ProfileId;

  if (!id) {
    return res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Consulta ao Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // Se o perfil não for encontrado, mantém a resposta idêntica ao PHP
    if (!profile) {
      return res.status(404).send('0 results');
    }

    // 4. Retorna o objeto formatado para o Unity
    return res.status(200).json(formatProfileObject(profile));

  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao buscar perfil no Supabase',
      details: err.message
    });
  }
}

// Função de formatação para manter paridade com o Unity[cite: 2]
function formatProfileObject(data) {
  return {
    ProfileId: data.id || 0,
    Status: data.status ?? 1,
    UserName: data.username || '',
    NickName: data.nickname || '',
    AccountDate: data.accountdate || data.created_at || '',
    Gender: data.gender || '',
    Email: data.email || '',
    Birthday: data.birthday || '',
    Location: data.location || '',
    Password: data.password || '',
    Authenticator: data.authenticator || '',
    Score: Number(data.score || 0),
    TokenFacebook: data.tokenfacebook || '',
    Achievement: data.achievement || '',
    ImgBase64: data.avatar_id || ''
  };
}