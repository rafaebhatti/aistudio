
import React from 'react';
import type { CodeFile } from '../types';

interface CodeViewerProps {
  file: CodeFile;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ file }) => {
  return (
    <div className="bg-[#0d1117] text-sm h-full">
      <pre className="p-4 overflow-auto h-full w-full">
        <code className={`language-${file.language} text-gray-300 font-mono`}>
          {file.code}
        </code>
      </pre>
    </div>
  );
};

export default CodeViewer;
