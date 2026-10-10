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
      const userId = req.query?.userid || req.query?.userId || req.query?.UserID;
      if (!userId) {
        return res.status(400).json({ status: 400, message: 'ID do utilizador é obrigatório.' });
      }

      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapeia os dados para garantir compatibilidade com as propriedades do Unity (incluindo created_at e status)
      const questionList = (questions || []).map(q => ({
        Id: q.id,
        Question: q.question,
        Dificulty: q.dificulty,
        ReplyZero: q.reply_zero,
        ReplyOne: q.reply_one,
        ReplyTwo: q.reply_two,
        ReplyThree: q.reply_three,
        Author: q.author,
        UserID: q.user_id,
        Explication: q.explication,
        StatusValue: q.status,
        Created_at: q.created_at ? new Date(q.created_at).toLocaleString('pt-BR') : ''
      }));

      // Identifica e remove do Supabase as questões rejeitadas (status = 2) após recuperá-las
      const rejectedIds = (questions || []).filter(q => q.status === 2).map(q => q.id);
      if (rejectedIds.length > 0) {
        await supabase.from('questions').delete().in('id', rejectedIds);
      }

      return res.status(200).json({ status: 200, questions: questionList });
    } catch (err) {
      return res.status(500).json({ status: 500, message: 'Erro no GET', error: err.message });
    }
  }

  // --- TRATAMENTO PARA O MÉTODO POST (Envio de Nova Questão) ---
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      const question = body.Question || body.question;
      const dificulty = body.Dificulty ?? body.dificulty ?? 0;
      const reply_zero = body.ReplyZero || body.reply_zero || '';
      const reply_one = body.ReplyOne || body.reply_one || '';
      const reply_two = body.ReplyTwo || body.reply_two || '';
      const reply_three = body.ReplyThree || body.reply_three || '';
      const author = body.Author || body.author || 'Desconhecido';
      const userid = body.UserID || body.userid || body.user_id;
      const explication = body.Explication || body.explication || '';

      if (!question || !userid) {
        return res.status(400).json({ 
          status: 400, 
          message: 'A questão e o ID do utilizador são obrigatórios.',
          receivedBody: body 
        });
      }

      // Opcional: Evitar duplicadas exatas
      const { data: existingQuestion } = await supabase
        .from('questions')
        .select('id')
        .eq('question', question)
        .maybeSingle();

      if (existingQuestion) {
        return res.status(200).json({ status: 200, id: -1, message: 'Esta questão já foi enviada.' });
      }

      const newQuestionData = {
        question: question,
        dificulty: Number(dificulty),
        reply_zero: reply_zero,
        reply_one: reply_one,
        reply_two: reply_two,
        reply_three: reply_three,
        author: author,
        user_id: userid,
        explication: explication,
        status: 0 // 0 = Pendente
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('questions')
        .insert([newQuestionData])
        .select()
        .single();

      if (insertError) {
        console.error("Erro do Supabase ao inserir:", insertError);
        return res.status(400).json({ status: 400, message: 'Erro ao inserir no Supabase', supabaseError: insertError.message });
      }

      return res.status(200).json({
        status: 200,
        id: insertResult.id,
        message: 'Questão enviada com sucesso!'
      });

    } catch (err) {
      console.error("Erro interno no POST:", err);
      return res.status(500).json({ status: 500, message: 'Erro interno ao salvar questão', error: err.message });
    }
  }

  return res.status(405).json({ status: 405, message: 'Método não permitido' });
}
