
import type { CodeFile, PromptSuggestion } from './types';

export const LAB_FILES: CodeFile[] = [
  {
    id: 'vulnerable',
    name: 'server_vulnerable.py',
    language: 'python',
    code: `from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.post("/run_cmd")
def run_cmd():
    data = request.get_json(force=True, silent=True) or {}
    cmd = data.get("cmd", "echo hello")
    # VULNERABLE: shell=True executes metacharacters
    try:
        out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True, timeout=3)
        return jsonify({"ok": True, "output": out})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

if __name__ == "__main__":
    app.run(port=7001)`,
  },
  {
    id: 'exploit',
    name: 'exploit.py',
    language: 'python',
    code: `import requests, argparse

parser = argparse.ArgumentParser()
parser.add_argument("--defended", action="store_true")
args = parser.parse_args()

port = 7002 if args.defended else 7001
url = f"http://127.0.0.1:{port}/run_cmd"

if not args.defended:
    payload = {"cmd": "echo SAFE && echo PWNED > /tmp/pwned.txt"}
else:
    payload = {"cmd": ["echo", "SAFE"]}

r = requests.post(url, json=payload, timeout=5)
print("Status:", r.status_code, "Body:", r.text)`,
  },
  {
    id: 'defended',
    name: 'server_defended.py',
    language: 'python',
    code: `from flask import Flask, request, jsonify
import subprocess, shlex

app = Flask(__name__)

ALLOWED_CMDS = {
    "echo": ["echo"],
    "date": ["date"],
    "uptime": ["uptime"],
}

def validate(cmdlist):
    if not isinstance(cmdlist, list) or not cmdlist:
        raise ValueError("Command must be a non-empty list")
    base = cmdlist[0]
    if base not in ALLOWED_CMDS:
        raise ValueError("Command not allowed")
    # No metacharacters; only plain args
    for arg in cmdlist[1:]:
        if any(c in arg for c in [";", "&", "|", "$", "\`"]):
            raise ValueError("Invalid characters in arguments")

@app.post("/run_cmd")
def run_cmd():
    data = request.get_json(force=True, silent=True) or {}
    cmd = data.get("cmd", [])
    try:
        validate(cmd)
        out = subprocess.check_output(cmd, shell=False, text=True, stderr=subprocess.STDOUT, timeout=3)
        return jsonify({"ok": True, "output": out})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

if __name__ == "__main__":
    app.run(port=7002)`,
  },
   {
    id: 'test',
    name: 'test_lab3.py',
    language: 'python',
    code: `import requests, subprocess, threading, time, os, sys
from server_defended import app as defended_app

def run_app():
    defended_app.run(port=7002)

if __name__ == "__main__":
    t = threading.Thread(target=run_app, daemon=True)
    t.start()
    time.sleep(1)
    r = requests.post("http://127.0.0.1:7002/run_cmd", json={"cmd": ["echo", "SAFE"]})
    assert r.json().get("ok") is True
    print("defended ok")
    r = requests.post("http://127.0.0.1:7002/run_cmd", json={"cmd": ["bash", "-c", "whoami"]})
    assert r.status_code == 400
    print("blocked disallowed command")`,
  },
];

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
    {
        id: 'explain-vuln',
        title: "Explain the Vulnerability",
        description: "Analyze how `shell=True` leads to RCE and point to specific lines.",
        fullPromptGenerator: (files) => {
            const vulnerableCode = files.find(f => f.id === 'vulnerable')?.code || '';
            return `You are a cybersecurity expert explaining vulnerabilities to a developer.
Based on the following Python code in \`server_vulnerable.py\`, explain in detail how using \`subprocess.check_output\` with \`shell=True\` and unvalidated user input leads to a Remote Code Execution (RCE) vulnerability. 

Please be specific:
1.  Identify the exact line(s) of code that introduce the vulnerability.
2.  Explain what shell metacharacters are (e.g., \`&&\`, \`;\`, \`|\`) and how they can be used to inject malicious commands.
3.  Provide a clear example of a malicious payload and trace how it would be executed by the vulnerable server.

Here is the code:
\`\`\`python
${vulnerableCode}
\`\`\`
`
        }
    },
    {
        id: 'refactor',
        title: "Propose a Secure Rewrite",
        description: "Refactor to `shell=False`, implement a strict allowlist, and validate arguments.",
        fullPromptGenerator: (files) => {
             const vulnerableCode = files.find(f => f.id === 'vulnerable')?.code || '';
             const defendedCode = files.find(f => f.id === 'defended')?.code || '';
             return `You are a senior security engineer mentoring a junior developer.
The developer has written the following vulnerable Flask application (\`server_vulnerable.py\`):
\`\`\`python
${vulnerableCode}
\`\`\`

Your task is to explain how to refactor this code to make it secure. Use the provided \`server_defended.py\` as a reference to explain the key mitigation strategies.

Cover these three main points in your explanation:
1.  **Disabling the Shell:** Explain why changing \`shell=True\` to \`shell=False\` is the most critical first step and how it fundamentally changes command processing.
2.  **Allowlist Enforcement:** Describe the purpose of the \`ALLOWED_CMDS\` dictionary and why an explicit allowlist is a robust security control.
3.  **Argument Validation:** Explain the role of the \`validate\` function, specifically how it checks for command structure and dangerous metacharacters in arguments.

Here is the secure, refactored code for your reference (\`server_defended.py\`):
\`\`\`python
${defendedCode}
\`\`\`
`
        }
    },
    {
        id: 'exploit-analysis',
        title: "Analyze the Exploit",
        description: "Explain how the exploit script works against the vulnerable server.",
        fullPromptGenerator: (files) => {
            const exploitCode = files.find(f => f.id === 'exploit')?.code || '';
            const vulnerableCode = files.find(f => f.id === 'vulnerable')?.code || '';
            return `You are a security analyst. Explain how the provided Python script (\`exploit.py\`) successfully attacks the vulnerable server (\`server_vulnerable.py\`).

Your analysis should include:
1.  A breakdown of the malicious payload: \`{"cmd": "echo SAFE && echo PWNED > /tmp/pwned.txt"}\`. What does each part of this command do?
2.  How the \`shell=True\` vulnerability in the server allows this payload to execute both commands.
3.  What is the ultimate impact of this successful exploit (i.e., what does the creation of \`/tmp/pwned.txt\` signify)?

Here is the exploit script:
\`\`\`python
${exploitCode}
\`\`\`

And here is the vulnerable server code it targets:
\`\`\`python
${vulnerableCode}
\`\`\`
`
        }
    },
    {
        id: 'governance',
        title: "Map to Security Controls",
        description: "Map the mitigations to governance controls like NIST AI RMF or ISO/IEC 42001.",
        fullPromptGenerator: (files) => {
            const defendedCode = files.find(f => f.id === 'defended')?.code || '';
            return `You are a security compliance and governance specialist.
The engineering team has implemented several security mitigations in their Python code to prevent command injection vulnerabilities. The key mitigations are:
1.  Executing commands with \`shell=False\`.
2.  Implementing a strict allowlist of permitted commands.
3.  Validating all command arguments to reject shell metacharacters.

Your task is to map these technical mitigations to relevant governance controls from established cybersecurity and AI frameworks. Please provide mappings for:
-   **NIST AI Risk Management Framework (AI RMF):** Focus on the "Govern" and "Map" functions. How do these code-level controls support principles like safety, security, and transparency?
-   **ISO/IEC 42001 (AI Management System):** Connect these practices to clauses related to risk assessment, risk treatment, and operational controls for AI systems.
-   **OWASP Top 10:** Identify which OWASP category this vulnerability (and its mitigation) falls under.

Here is the defended code for context:
\`\`\`python
${defendedCode}
\`\`\`
`
        }
    }
];
