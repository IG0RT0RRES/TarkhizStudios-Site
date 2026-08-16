import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    const { error } = await supabase.from('contacts').insert([formData]);

    if (error) {
      setStatus({ loading: false, success: false, error: error.message });
    } else {
      setStatus({ loading: false, success: true, error: null });
      setFormData({ name: '', email: '', message: '' });
    }
  };

  return (
    <section id="contact" className="py-20 max-w-2xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-8">Entre em Contato</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            type="text"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input
            type="email"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mensagem</label>
          <textarea
            required
            rows="4"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={status.loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
        >
          {status.loading ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Mensagem</>}
        </button>

        {status.success && (
          <p className="text-green-400 text-sm flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4" /> Mensagem enviada com sucesso!
          </p>
        )}
        {status.error && (
          <p className="text-red-400 text-sm flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4" /> Erro ao enviar: {status.error}
          </p>
        )}
      </form>
    </section>
  );
}