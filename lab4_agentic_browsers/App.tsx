
import React, { useState, useCallback } from 'react';
import { CodeBlock } from './components/CodeBlock';
import { SimulationPanel } from './components/SimulationPanel';
import { VULNERABLE_AGENT_CODE, DEFENDED_AGENT_CODE, PHISHING_HTML_CODE, RECEIVER_SERVER_CODE } from './constants';
import type { LogEntry, ReceiverData } from './types';
import { LogEntryType } from './types';

type CodeTab = 'vulnerable' | 'defended' | 'phishing' | 'receiver';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<CodeTab>('vulnerable');
    const [log, setLog] = useState<LogEntry[]>([]);
    const [receiverData, setReceiverData] = useState<ReceiverData | null>(null);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    const addLogEntry = useCallback((message: string, type: LogEntryType) => {
        setLog(prevLog => [...prevLog, { message, type, timestamp: new Date() }]);
    }, []);

    const runSimulation = useCallback(async (agentType: 'vulnerable' | 'defended') => {
        setIsRunning(true);
        setLog([]);
        setReceiverData(null);

        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        addLogEntry(`--- Starting ${agentType} agent simulation ---`, LogEntryType.System);
        await delay(500);

        addLogEntry('Agent loading phishing.html...', LogEntryType.Info);
        await delay(700);

        const metaMatch = PHISHING_HTML_CODE.match(/<meta name="ai-instructions" content="([^"]+)"/);
        const instructions = metaMatch ? metaMatch[1] : null;

        if (instructions) {
            addLogEntry(`Found meta instructions: "${instructions}"`, LogEntryType.Info);
            await delay(700);
        } else {
            addLogEntry('No meta instructions found.', LogEntryType.Warning);
            setIsRunning(false);
            return;
        }

        if (agentType === 'vulnerable') {
            const postMatch = instructions.match(/POST\s+(https?:\/\/\S+)/);
            if (postMatch) {
                const url = postMatch[1];
                addLogEntry(`VULNERABLE: Obeying instruction to POST to ${url}`, LogEntryType.Warning);
                await delay(800);
                addLogEntry('Secret token exfiltrated!', LogEntryType.Error);
                setReceiverData({
                    secret: "SESSION_TOKEN=tok_live_THIS_IS_FAKE",
                    note: "exfil from vulnerable agent",
                    timestamp: new Date()
                });
                addLogEntry(`--- Simulation finished ---`, LogEntryType.System);
            }
        } else { // defended agent
            const NO_PAGE_INSTRUCTION = true;
            if (NO_PAGE_INSTRUCTION) {
                addLogEntry('Policy [NO_PAGE_INSTRUCTION] is active.', LogEntryType.Success);
                await delay(700);
                addLogEntry('Ignoring page-supplied instructions. Action blocked.', LogEntryType.Success);
                addLogEntry(`--- Simulation finished ---`, LogEntryType.System);
            }
        }

        setIsRunning(false);
    }, [addLogEntry]);


    const renderCodeContent = () => {
        switch (activeTab) {
            case 'vulnerable':
                return <CodeBlock title="agent_browser_vulnerable.py" code={VULNERABLE_AGENT_CODE} language="python" />;
            case 'defended':
                return <CodeBlock title="agent_browser_defended.py" code={DEFENDED_AGENT_CODE} language="python" />;
            case 'phishing':
                return <CodeBlock title="phishing.html" code={PHISHING_HTML_CODE} language="html" />;
            case 'receiver':
                return <CodeBlock title="receiver_server.py" code={RECEIVER_SERVER_CODE} language="python" />;
            default:
                return null;
        }
    };
    
    const TabButton = ({ tab, children }: {tab: CodeTab, children: React.ReactNode}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
                activeTab === tab 
                ? 'bg-slate-700 text-cyan-300 border-b-2 border-cyan-300' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
            <header className="mb-6 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-cyan-300">Agentic Browser Security Lab</h1>
                <p className="mt-2 text-slate-400 max-w-3xl mx-auto">
                    An interactive simulation of prompt injection vulnerabilities in web-browsing AI agents.
                </p>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="bg-slate-800 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-700">
                    <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900/50 px-4">
                        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                           <TabButton tab="vulnerable">Vulnerable Agent</TabButton>
                           <TabButton tab="defended">Defended Agent</TabButton>
                           <TabButton tab="phishing">Phishing Page</TabButton>
                           <TabButton tab="receiver">Receiver Server</TabButton>
                        </nav>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                       {renderCodeContent()}
                    </div>
                </div>

                <div className="bg-slate-800 rounded-lg shadow-2xl flex flex-col border border-slate-700">
                   <SimulationPanel
                        log={log}
                        receiverData={receiverData}
                        isRunning={isRunning}
                        onRunVulnerable={() => runSimulation('vulnerable')}
                        onRunDefended={() => runSimulation('defended')}
                    />
                </div>
            </main>
        </div>
    );
};

export default App;
