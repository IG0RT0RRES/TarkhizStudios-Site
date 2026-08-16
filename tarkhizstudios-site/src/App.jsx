import React from 'react';
import Navbar from './components/Navbar';
import ContactForm from './components/ContactForm';
import Comments from './components/Comments';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      <Navbar />
      <main className="pt-24 space-y-12">
        <section className="text-center py-12 px-4">
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Desenvolvedor Full Stack & Mobile
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Bem-vindo ao meu espaço! Aqui compartilho meus projetos, soluções e experimentos em software.
          </p>
        </section>

        <Comments />
        <ContactForm />
      </main>
    </div>
  );
}