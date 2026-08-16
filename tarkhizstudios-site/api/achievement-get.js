import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para chamadas da Unity / Front-end
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

  // 2. Captura de dados (aceita id via Query GET ou Body POST)
  const id = req.query.id || req.body?.id || req.body?.ProfileId;

  if (!id) {
    return res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Consulta as conquistas do perfil ou da tabela user_unlocks
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('achievement')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // 4. Retorna no formato esperado pelo C# no Unity
    if (profile && profile.achievement !== null && profile.achievement !== undefined) {
      return res.status(200).json({
        Achievement: profile.achievement[cite: 6]
      });
    } else {
      return res.status(200).json({
        Achievement: '',[cite: 6]
        message: 'Nenhuma conquista encontrada'[cite: 6]
      });
    }

  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao consultar conquistas no Supabase',
      details: err.message
    });
  }
}