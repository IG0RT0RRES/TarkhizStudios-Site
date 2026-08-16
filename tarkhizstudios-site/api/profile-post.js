import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para chamadas do Unity / Front-end
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

  // 2. Captura de dados (suporta JSON e x-www-form-urlencoded do Unity)
  const body = req.body || {};
  const id = body.id || body.ProfileId;[cite: 7]
  const icon = body.icon || body.avatar_id || body.IconBase64 || "";[cite: 7]
  const score = parseInt(body.score ?? body.Score ?? 0, 10);[cite: 7]
  const nickname = body.nickname || body.NickName || "";[cite: 7]
  const achievement = body.achievement || body.Achievement || "";[cite: 7]

  if (!id) {
    return res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Monta o objeto de atualização dinamicamente
    const updateData = {
      score: score,[cite: 7]
      nickname: nickname,[cite: 7]
      achievement: achievement,[cite: 7]
      updated_at: new Date().toISOString()
    };

    // Atualiza o avatar_id se um ícone válido foi fornecido
    if (icon) {
      updateData.avatar_id = icon;
    }

    // 4. Executa a atualização no Supabase
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw error;
    }

    // 5. Retorno simples em texto puro para paridade exata com o PHP
    return res.status(200).send("No need to return an object");[cite: 7]

  } catch (err) {
    return res.status(500).json({
      error: "Erro ao atualizar banco de dados",[cite: 7]
      details: err.message
    });
  }
}