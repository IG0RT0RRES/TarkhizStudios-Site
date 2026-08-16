import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configura cabeçalhos de CORS (se for acessar de domínios/jogos externos)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // Validação preventiva das variáveis de ambiente
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Configuração ausente',
      message: 'SUPABASE_URL ou SUPABASE_ANON_KEY não estão configuradas na Vercel.'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: leaderboard, error } = await supabase
      .from('profiles')
      .select('nickname, score, avatar_id')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    const formattedDate = new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    const listResult = (leaderboard || []).map((player, index) => {
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

    return res.status(200).json({
      Date: formattedDate,
      ListResult: listResult
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Erro na execução da função',
      details: err.message
    });
  }
}