
import React, { useState } from 'react';
import type { CodeFile } from './types';
import { LAB_FILES } from './constants';
import CodeViewer from './components/CodeViewer';
import ChatInterface from './components/ChatInterface';
import { LabIcon } from './components/icons';

const App: React.FC = () => {
  const [activeFile, setActiveFile] = useState<CodeFile>(LAB_FILES[0]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <LabIcon className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Interactive RCE Security Lab</h1>
            <p className="text-sm text-gray-400">Analyze & Mitigate Command Injection Vulnerabilities with Gemini</p>
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Left Pane: Code Viewer */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-700">
          <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800">
            <nav className="flex space-x-1 p-2">
              {LAB_FILES.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setActiveFile(file)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    activeFile.id === file.id
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  {file.name}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-grow overflow-auto">
             <CodeViewer file={activeFile} />
          </div>
        </div>

        {/* Right Pane: Chat Interface */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
};

export default App;
