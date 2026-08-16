import React from 'react';
import { Code2, MessageSquare, Send, FolderGit2 } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur fixed top-0 w-full z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2 font-bold text-xl text-blue-400">
          <Code2 className="w-6 h-6" />
          <span>TarkHiz Studios</span>
        </div>
        <div className="flex space-x-6 text-sm text-slate-300">
          <a href="#projects" className="hover:text-blue-400 flex items-center gap-1 transition">
            <FolderGit2 className="w-4 h-4" /> Projetos
          </a>
          <a href="#comments" className="hover:text-blue-400 flex items-center gap-1 transition">
            <MessageSquare className="w-4 h-4" /> Comentários
          </a>
          <a href="#contact" className="hover:text-blue-400 flex items-center gap-1 transition">
            <Send className="w-4 h-4" /> Contato
          </a>
        </div>
      </div>
    </nav>
  );
}