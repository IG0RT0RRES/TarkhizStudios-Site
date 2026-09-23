import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, message: 'Método não permitido' });
  }

  try {
    const { userId, table, data } = req.body;

    if (!userId || !table || !data) {
      return res.status(400).json({ 
        status: 400, 
        message: 'Parâmetros insuficientes. Envie "userId", "table" e "data".' 
      });
    }

    let queryResult;

    // Trata cada tabela de acordo com a sua regra de negócio
    switch (table) {
      case 'user_properties':
        // Como as propriedades são únicas por utilizador, usamos .upsert() baseado no user_id
        queryResult = await supabase
          .from('user_properties')
          .upsert({ user_id: userId, ...data }, { onConflict: 'user_id' })
          .select();
        break;

      case 'user_unlocks':
        // Regista um novo desbloqueio para o utilizador (adiciona linha)
        queryResult = await supabase
          .from('user_unlocks')
          .insert({ user_id: userId, ...data })
          .select();
        break;

      case 'user_history':
        // Adiciona um novo evento ao histórico do utilizador
        queryResult = await supabase
          .from('user_history')
          .insert({ user_id: userId, ...data })
          .select();
        break;

      default:
        return res.status(400).json({ status: 400, message: 'Tabela especificada inválida' });
    }

    if (queryResult.error) {
      return res.status(400).json({ status: 400, message: queryResult.error.message });
    }

    return res.status(200).json({ 
      status: 200, 
      message: 'Dados processados com sucesso', 
      result: queryResult.data 
    });

  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Erro interno no servidor', error: err.message });
  }
}
