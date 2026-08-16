import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Send, CheckCircle2, AlertCircle, User } from 'lucide-react';

export default function Comments() {
  const [commentsList, setCommentsList] = useState([]);
  const [formData, setFormData] = useState({ author: '', content: '' });
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  // Busca os comentários salvos no Supabase
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCommentsList(data);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    // Envia exatamente as colunas presentes no seu banco: author, content e project_slug
    const { error } = await supabase.from('comments').insert([
      {
        author: formData.author,
        content: formData.content,
        project_slug: 'general',
      },
    ]);

    if (error) {
      setStatus({ loading: false, success: false, error: error.message });
    } else {
      setStatus({ loading: false, success: true, error: null });
      setFormData({ author: '', content: '' });
      fetchComments();
    }
  };

  return (
    <section id="comments" className="py-20 max-w-3xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
        <MessageSquare className="w-8 h-8 text-emerald-400" />
        Comentários & Feedbacks
      </h2>

      {/* Formulário de Envio */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700 mb-10">
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Deixe seu comentário</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Seu Nome / Nick</label>
          <input
            type="text"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Comentário</label>
          <textarea
            required
            rows="3"
            placeholder="Deixe uma mensagem ou sugestão..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={status.loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {status.loading ? 'Publicando...' : <><Send className="w-4 h-4" /> Comentar</>}
        </button>

        {status.success && (
          <p className="text-green-400 text-sm flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4" /> Comentário publicado com sucesso!
          </p>
        )}
        {status.error && (
          <p className="text-red-400 text-sm flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4" /> Erro ao publicar: {status.error}
          </p>
        )}
      </form>

      {/* Mural de Comentários */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold mb-4">Comentários Recentes</h3>
        {commentsList.length === 0 ? (
          <p className="text-slate-400 text-center py-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            Nenhum comentário publicado ainda. Seja o primeiro!
          </p>
        ) : (
          commentsList.map((item) => (
            <div key={item.id || item.created_at} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <User className="w-4 h-4" />
                {/* Acessa a coluna 'author' vinda do Supabase */}
                <span>{item.author || 'Anônimo'}</span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{item.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}