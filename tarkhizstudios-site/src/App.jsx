import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importações dos componentes
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import Projects from './components/Projects.jsx';
import Comments from './components/Comments.jsx';
import ContactForm from './components/ContactForm.jsx';
import panel_adm from './components/panel_adm.jsx';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      <BrowserRouter>
        {/* Navbar fixa no topo */}
        <Navbar />

        <Routes>
          {/* Landing Page Completa */}
          <Route
            path="/"
            element={
              <main className="space-y-12 pt-24 pb-12">
                <Hero />
                <Projects />
                <Comments />
                <ContactForm />
              </main>
            }
          />

          {/* Rotas para visualização isolada das seções */}
          <Route
            path="/projetos"
            element={
              <main className="pt-24 pb-12">
                <Projects />
              </main>
            }
          />
          <Route
            path="/comentarios"
            element={
              <main className="pt-24 pb-12">
                <Comments />
              </main>
            }
          />
          <Route
            path="/contato"
            element={
              <main className="pt-24 pb-12">
                <ContactForm />
              </main>
            }
          />
          <Route path="/adm" element={ <main className="pt-24 pb-12"> <panel_adm/></main> }/>

          {/* Tratamento de Rota Não Encontrada (404) */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h1 className="text-4xl font-bold text-red-500 mb-2">404</h1>
                <p className="text-xl text-slate-300">Página Não Encontrada</p>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;