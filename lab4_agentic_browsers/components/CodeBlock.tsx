
import React from 'react';

interface CodeBlockProps {
    title: string;
    code: string;
    language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ title, code, language }) => {
    return (
        <div className="p-4 h-full">
            <div className="bg-slate-900 rounded-md h-full flex flex-col">
                <div className="flex-shrink-0 px-4 py-2 border-b border-slate-700">
                    <span className="text-sm font-medium text-slate-400">{title}</span>
                </div>
                <div className="flex-grow overflow-auto p-4">
                    <pre className="text-sm">
                        <code className={`language-${language}`}>{code}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};
