import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // 1. Busca os 10 primeiros colocados no Supabase
    const { data: leaderboard, error } = await supabase
      .from('profiles')
      .select('nickname, score, avatar_id')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // 2. Formata a data atual no padrão 'YYYY-MM-DD HH:mm:ss'
    const formattedDate = new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    // 3. Mapeia os registros para a estrutura esperada
    const listResult = leaderboard.map((player, index) => {
      // Garante a formatação do avatar (ex: 'avatar-18' -> 'Avatar-18')
      const formattedAvatar = player.avatar_id
        ? player.avatar_id.replace(/^avatar-/i, 'Avatar-')
        : 'Avatar-0';

      return {
        Nickname: player.nickname || '',
        Description: 'Best Score',
        Score: String(player.score || 0),
        Position: index,
        IconBase64: formattedAvatar
      };
    });

    // 4. Retorna a resposta no formato exato solicitado
    return res.status(200).json({
      Date: formattedDate,
      ListResult: listResult
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao gerar o leaderboard',
      details: err.message
    });
  }
}