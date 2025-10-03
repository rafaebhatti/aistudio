
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, PromptSuggestion } from '../types';
import { PROMPT_SUGGESTIONS, LAB_FILES } from '../constants';
import { generateContent } from '../services/geminiService';
import { GeminiIcon, UserIcon, SendIcon, SparklesIcon } from './icons';

// A component to format Gemini's response, handling markdown for code blocks
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(```(?:\w+\n)?[\s\S]*?```)/);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        const codeBlockMatch = part.match(/```(?:\w+\n)?([\s\S]*?)```/);
        if (codeBlockMatch) {
          const code = codeBlockMatch[1];
          return (
            <pre key={index} className="bg-gray-900/70 rounded-lg p-4 text-sm font-mono overflow-x-auto">
              <code>{code.trim()}</code>
            </pre>
          );
        }
        // Replace newlines with <br> for regular text parts
        const lines = part.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ));

        return <p key={index}>{lines}</p>;
      })}
    </div>
  );
};


const ChatInterface: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [chatHistory]);

  const handlePromptSelect = async (promptSuggestion: PromptSuggestion) => {
    setIsLoading(true);

    const userMessage: ChatMessage = { sender: 'user', text: promptSuggestion.title };
    setChatHistory(prev => [...prev, userMessage]);
    
    // Generate the full prompt with context
    const fullPrompt = promptSuggestion.fullPromptGenerator(LAB_FILES);

    // Call Gemini API
    const geminiResponse = await generateContent(fullPrompt);
    const geminiMessage: ChatMessage = { sender: 'gemini', text: geminiResponse };
    setChatHistory(prev => [...prev, geminiMessage]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/50">
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="space-y-6">
          {chatHistory.length === 0 && (
            <div className="text-center p-8 rounded-lg bg-gray-800 border border-gray-700">
               <SparklesIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Welcome to the AI Security Lab</h2>
              <p className="text-gray-400 mb-6">Select a prompt below to begin your analysis with Gemini.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROMPT_SUGGESTIONS.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptSelect(prompt)}
                    disabled={isLoading}
                    className="p-4 bg-gray-700/50 rounded-lg text-left hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="font-semibold text-cyan-400">{prompt.title}</p>
                    <p className="text-sm text-gray-400">{prompt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatHistory.map((message, index) => (
            <div key={index} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : ''}`}>
              {message.sender === 'gemini' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <GeminiIcon className="w-5 h-5 text-white" />
                </div>
              )}
              <div className={`max-w-xl p-4 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600/20 text-blue-100'
                  : 'bg-gray-700/50 text-gray-300'
              }`}>
                {message.sender === 'gemini' ? <FormattedMessage text={message.text} /> : <p>{message.text}</p>}
              </div>
               {message.sender === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-4">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
                  <GeminiIcon className="w-5 h-5 text-white" />
                </div>
                <div className="max-w-xl p-4 rounded-lg bg-gray-700/50 w-full">
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-600 rounded-full w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-gray-600 rounded-full w-1/2 animate-pulse"></div>
                    <div className="h-3 bg-gray-600 rounded-full w-5/6 animate-pulse"></div>
                  </div>
                </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
       {chatHistory.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PROMPT_SUGGESTIONS.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptSelect(prompt)}
                    disabled={isLoading}
                    className="p-3 text-sm text-left bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <SendIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">{prompt.title}</span>
                  </button>
                ))}
              </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
