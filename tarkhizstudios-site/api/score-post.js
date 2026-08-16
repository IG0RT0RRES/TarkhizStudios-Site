import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para chamadas externas/Unity
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_ANON_KEY).'
    });
  }

  // 2. Captura dos dados (suporta JSON ou x-www-form-urlencoded do Unity)
  const body = req.body || {};
  const id = body.id || body.ProfileId;
  const score = parseInt(body.score ?? body.Score ?? 0, 10);

  if (!id) {
    return res.status(400).json({ error: 'O campo ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Atualiza a pontuação na tabela profiles
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        score: score,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, score')
      .single();

    if (error) {
      throw error;
    }

    // 4. Retorna a confirmação idêntica à estrutura do PHP
    return res.status(200).json({
      status: 'success',
      score: Number(data ? data.score : score)
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao atualizar pontuação', //[cite: 3]
      details: err.message
    });
  }
}