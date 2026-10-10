import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- TRATAMENTO PARA O MÉTODO GET (Verificação de Status + Autolimpeza de Rejeitadas) ---
  if (req.method === 'GET') {
    try {
      const userId = req.query?.userid || req.query?.userId;

      if (!userId) {
        return res.status(400).json({ status: 400, message: 'O ID do usuário é obrigatório para consulta.' });
      }

      // 1. Busca as questões do usuário na tabela 'questions'
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const questionList = questions || [];

      // 2. Identifica os IDs das questões que foram REJEITADAS (status = 2)
      const rejectedIds = questionList
        .filter(q => q.status === 2)
        .map(q => q.id);

      // 3. Deleta do Supabase as questões rejeitadas para limpar o banco
      if (rejectedIds.length > 0) {
        await supabase
          .from('questions')
          .delete()
          .in('id', rejectedIds);
      }

      // 4. Retorna a lista original para o Unity exibir a notificação de rejeição ao jogador
      return res.status(200).json({
        status: 200,
        questions: questionList
      });

    } catch (err) {
      return res.status(500).json({ status: 500, message: 'Erro ao buscar questões', error: err.message });
    }
  }

  // --- TRATAMENTO PARA O MÉTODO POST (Envio de Questão) ---
  if (req.method === 'POST') {
    try {
      const {
        question,
        dificulty,
        reply_zero,
        reply_one,
        reply_two,
        reply_three,
        author,
        userid,
        explication
      } = req.body || {};

      if (!question || !userid) {
        return res.status(400).json({ status: 400, message: 'A questão e o ID do autor são obrigatórios.' });
      }

      const { data: existingQuestion } = await supabase
        .from('questions')
        .select('id')
        .eq('question', question)
        .maybeSingle();

      if (existingQuestion) {
        return res.status(200).json({ status: 200, id: -1, message: 'Essa questão já foi enviada.' });
      }

      const newQuestionData = {
        question,
        dificulty: Number(dificulty || 0),
        reply_zero: reply_zero || '',
        reply_one: reply_one || '',
        reply_two: reply_two || '',
        reply_three: reply_three || '',
        author: author || 'Desconhecido',
        user_id: userid,
        explication: explication || '',
        status: 0 // 0 = Pendente
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('questions')
        .insert([newQuestionData])
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(200).json({
        status: 200,
        id: insertResult.id,
        message: 'Questão enviada com sucesso!'
      });

    } catch (err) {
      return res.status(500).json({ status: 500, message: 'Erro interno ao salvar a questão', error: err.message });
    }
  }

  return res.status(405).json({ status: 405, message: 'Método não permitido' });
}
