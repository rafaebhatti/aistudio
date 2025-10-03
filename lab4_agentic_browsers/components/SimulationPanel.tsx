
import React from 'react';
import type { LogEntry, ReceiverData } from '../types';
import { LogEntryType } from '../types';

interface SimulationPanelProps {
    log: LogEntry[];
    receiverData: ReceiverData | null;
    isRunning: boolean;
    onRunVulnerable: () => void;
    onRunDefended: () => void;
}

const getLogEntryColor = (type: LogEntryType): string => {
    switch (type) {
        case LogEntryType.Error: return 'text-red-400';
        case LogEntryType.Warning: return 'text-amber-400';
        case LogEntryType.Success: return 'text-green-400';
        case LogEntryType.System: return 'text-cyan-400';
        case LogEntryType.Info:
        default: return 'text-slate-300';
    }
};

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


export const SimulationPanel: React.FC<SimulationPanelProps> = ({ log, receiverData, isRunning, onRunVulnerable, onRunDefended }) => {
    return (
        <div className="p-4 flex flex-col h-full">
            <h2 className="text-xl font-bold text-slate-100 mb-4 border-b border-slate-700 pb-2">Simulation Environment</h2>
            
            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <button
                    onClick={onRunVulnerable}
                    disabled={isRunning}
                    className="flex items-center justify-center w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-md transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg"
                >
                    {isRunning ? <LoadingSpinner/> : '▶️'} Run Vulnerable Agent
                </button>
                <button
                    onClick={onRunDefended}
                    disabled={isRunning}
                    className="flex items-center justify-center w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-md transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg"
                >
                     {isRunning ? <LoadingSpinner/> : '🛡️'} Run Defended Agent
                </button>
            </div>

            {/* Simulation Log */}
            <div className="flex-grow bg-slate-900 rounded-md p-4 mb-4 overflow-y-auto h-64 border border-slate-700 shadow-inner">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">Agent Log</h3>
                <div className="font-mono text-sm space-y-1">
                    {log.map((entry, index) => (
                        <div key={index} className="flex">
                           <span className="text-slate-500 mr-2">{entry.timestamp.toLocaleTimeString()}</span>
                           <p className={getLogEntryColor(entry.type)}>{entry.message}</p>
                        </div>
                    ))}
                     {isRunning && <div className="flex items-center text-slate-400"><LoadingSpinner/> <span>Processing...</span></div>}
                </div>
            </div>

            {/* Receiver Server */}
            <div className={`bg-slate-900 rounded-md p-4 border transition-all duration-300 ${receiverData ? 'border-red-500 shadow-red-500/20' : 'border-slate-700'} shadow-inner`}>
                 <h3 className="text-lg font-semibold text-cyan-300 mb-2">Receiver Server</h3>
                 {receiverData ? (
                     <div className="font-mono text-sm text-red-300 animate-pulse">
                         <p className="font-bold text-red-200">[ALERT] Data Received!</p>
                         <p>Timestamp: {receiverData.timestamp.toLocaleString()}</p>
                         <p className="break-words">Secret: "{receiverData.secret}"</p>
                         <p>Note: "{receiverData.note}"</p>
                     </div>
                 ) : (
                     <p className="text-slate-500 text-sm">Waiting for incoming POST requests...</p>
                 )}
            </div>
        </div>
    );
};
