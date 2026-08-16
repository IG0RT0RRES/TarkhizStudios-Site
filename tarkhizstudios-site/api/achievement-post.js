import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para chamadas da Unity / Front-end
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
  const id = body.id || body.ProfileId;[cite: 8]
  const achievement = body.achievement || body.Achievement || "";[cite: 8]

  if (!id) {
    return res.status(400).json({ error: 'O campo ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Atualiza o campo achievement na tabela profiles
    const { error } = await supabase
      .from('profiles')
      .update({
        achievement: achievement,[cite: 8]
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    // 4. Retorna a confirmação idêntica à estrutura do PHP
    return res.status(200).json({
      status: "success",[cite: 8]
      message: "Conquista salva"[cite: 8]
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erro ao atualizar conquista",[cite: 8]
      details: err.message
    });
  }
}