import React from 'react';
import { ExternalLink, Github, Code2, Smartphone, Globe } from 'lucide-react';

export default function Projects() {
  // Lista de projetos do seu estúdio / portfólio
  const projectsList = [
    {
      id: 1,
      title: 'Quiz of Challenger',
      category: 'Mobile App / Unity',
      description: 'Aplicativo de quiz interativo com integração de anúncios e publicação na Google Play Store.',
      techs: ['C#', 'Unity', 'LevelPlay', 'Google Play API'],
      githubUrl: 'https://github.com/igOrtOrres',
      liveUrl: 'https://play.google.com/store', // Ajuste para o link do seu app na Play Store
      type: 'mobile',
    },
    {
      id: 2,
      title: 'Tarkhiz Studios Site',
      category: 'Web Application',
      description: 'Site institucional e portfólio responsivo com roteamento de SPA e banco de dados via Supabase.',
      techs: ['React', 'Vite', 'Tailwind CSS v4', 'Supabase'],
      githubUrl: 'https://github.com/igOrtOrres',
      liveUrl: 'https://tarkhiz-studios-site.vercel.app',
      type: 'web',
    },
  ];

  return (
    <section id="projetos" className="py-20 max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3">
          <Code2 className="w-8 h-8 text-blue-500" />
          Nossos Projetos
        </h2>
        <p className="text-slate-400 mt-2 text-base sm:text-lg">
          Conheça as aplicações, jogos e softwares desenvolvidos pela Tarkhiz Studios.
        </p>
      </div>

      {/* Grid de Cards de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projectsList.map((project) => (
          <div
            key={project.id}
            className="bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-blue-500/10"
          >
            <div>
              {/* Header do Card */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                  {project.type === 'mobile' ? (
                    <Smartphone className="w-3.5 h-3.5" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  {project.category}
                </span>
              </div>

              {/* Título e Descrição */}
              <h3 className="text-2xl font-bold text-slate-100 mb-2">
                {project.title}
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {project.description}
              </p>

              {/* Badges de Tecnologias */}
              <div className="flex flex-wrap gap-2 mb-6">
                {project.techs.map((tech, index) => (
                  <span
                    key={index}
                    className="text-xs bg-slate-900 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Links e Ações */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-700/60">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition"
                >
                  <Github className="w-4 h-4" />
                  Repositório
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium ml-auto transition"
                >
                  Visualizar
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}