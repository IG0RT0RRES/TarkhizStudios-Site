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

  // 2. Captura de dados e log para inspecionar no painel da Vercel
  const body = req.body || {};
  
  console.log("=== CORPO DA REQUISIÇÃO RECEBIDO ===");
  console.log(JSON.stringify(body, null, 2));

  const id = body.id || body.ProfileId;
  const username = body.UserName || body.username || "";
  const icon = body.icon || body.avatar_id || body.IconBase64 || "";

  // 3. Validação de Conteúdo Específico
  if (!id || !icon) {
    return res.status(400).json({ 
      error: "Dados incompletos", 
      receivedBody: body 
    });
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

    // 5. Retorno de sucesso
    return res.status(200).json({
      status: "success",
      message: "Icon updated"
    });

  } catch (err) {
    return res.status(500).json({
      error: "Falha ao processar imagem no servidor",
      details: err.message
    });
  }
}
