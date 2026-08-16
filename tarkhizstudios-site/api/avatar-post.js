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

  // 2. Captura de dados (suporta JSON ou x-www-form-urlencoded do Unity)
  const body = req.body || {};
  const id = body.id || body.ProfileId;
  const username = body.UserName || body.username || "";[cite: 4]
  const icon = body.icon || body.avatar_id || body.IconBase64 || "";[cite: 4]

  // 3. Validação de Conteúdo Específico
  if (!id || !icon) {
    return res.status(400).json({ error: "Dados incompletos" });[cite: 4]
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 4. Atualização do avatar na tabela profiles
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_id: icon,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    // 5. Retorno de sucesso mantendo a paridade com o PHP
    return res.status(200).json({
      status: "success",[cite: 4]
      message: "Icon updated"[cite: 4]
    });

  } catch (err) {
    return res.status(500).json({
      error: "Falha ao processar imagem no servidor",[cite: 4]
      details: err.message
    });
  }
}