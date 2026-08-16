import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase utilizando as variáveis de ambiente da Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Permite apenas requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Busca os 100 primeiros colocados ordenados por pontuação decrescente
    const { data: leaderboard, error } = await supabase
      .from('profiles')
      .select('id, username, nickname, score, avatar_id')
      .order('score', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Retorna a lista de ranking formatada
    return res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar o leaderboard',
      error: err.message,
    });
  }
}