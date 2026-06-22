# 🌊 BanriFlow

**BanriFlow** is an elite, AI-driven Cloud Security Posture Management (CSPM) and Infrastructure as Code (IaC) auditing CLI tool. It leverages advanced Large Language Models (LLMs) to perform deep architectural analysis, network topology checks, and security audits on Kubernetes (`.yaml`) and Terraform (`.tf`) configurations.

## 🚀 Features
- **AI-Powered Analysis**: Automatically detects security flaws, cost inefficiencies, architectural anti-patterns, and availability risks.
- **Holistic Topology Mode**: Scans your entire directory and analyzes how microservices communicate with each other, uncovering hidden network vulnerabilities.
- **Dynamic Language Support**: Ask questions or provide custom instructions in any language, and BanriFlow will respond in that language.
- **Multi-Provider Support**: Seamlessly use Gemini, OpenAI, Anthropic/Claude, OpenRouter, or Groq.
- **Interactive Setup Wizard**: Save API keys and configurations interactively, never touch an export command again!

## 📦 Installation

Ensure you have Go installed, then clone, build, and install the CLI tool globally:

```bash
git clone https://github.com/thebanri/BanriFlow.git
cd BanriFlow
go build -o banri
sudo mv banri /usr/local/bin/
```

## 🛠️ Usage

### 1. Configuration (Setup Wizard)
Configure your AI provider and API keys interactively. This securely saves your preferences to `~/.banriflow.env`.
```bash
banri set
```

### 2. Standard Security Scan
Scan a directory for Kubernetes and Terraform files. The AI will analyze each file individually.
```bash
banri scan ./my-infrastructure-dir
```

### 3. Holistic Topology Analysis (Cross-Container)
Analyze the entire architecture as a **whole**. This checks if your `frontend` can securely communicate with your `backend`, verifies NetworkPolicies, and audits AWS VPC/IAM structures.
```bash
banri scan ./my-infrastructure-dir --topology
# or
banri scan ./my-infrastructure-dir -t
```

### 4. Custom Instructions & Language Adaptability
Give the AI specific tasks or ask it to focus on a particular issue. If you write your instruction in Turkish, Spanish, etc., the AI will adapt and output the analysis in that language.
```bash
banri scan ./my-infrastructure-dir --ask "Focus ONLY on IAM roles and Kubernetes RBAC permissions."
# or
banri scan ./my-infrastructure-dir -t -a "Bütün veritabanı açıklarını bul ve bana detaylı anlat."
```

### 5. Live Cluster Analysis (Real-Time)
Connects directly to your active Kubernetes cluster (`~/.kube/config`) and performs a massive live audit of all running Deployments, Services, and NetworkPolicies!
```bash
banri live
# or with custom instruction:
banri live -a "Find all pods missing resource limits and explain in Turkish"
```

### 6. Manual (Static) Mode
Run the tool using local static rules (without an AI provider). *(Note: Static rules are currently placeholders and are meant to be expanded).*
```bash
banri scan ./my-infrastructure-dir --manual
```

### 7. 3D Topology Dashboard & Live API Server
Launch an embedded, stunning 3D Graphical User Interface (GUI) in your browser that visualizes your live Kubernetes cluster topology.
```bash
banri serve
```
Then open `http://localhost:3005` to interact with the 3D topology map and view AI-generated architectural analysis.

**Run in Background (Daemon Mode):**
If you don't want to hang your terminal, run it in the background:
```bash
banri serve -d
```
*(Note: An AI provider MUST be configured via `banri set` before launching the GUI).*

## 🧠 Behind the Scenes: SOTA LLM Optimization
BanriFlow is built with state-of-the-art prompt engineering and API optimizations to guarantee zero hallucination:
- **Chain of Thought (CoT):** Enforces a hidden `thought_process` mechanism, forcing the AI to reason logically before returning results.
- **Deterministic Output:** Uses `Temperature=0.1` and `Top-P=0.7` for strict, robotic, and highly accurate JSON schema compliance.
- **Token Efficiency:** Handles massive topologies flawlessly with an `8192` max token buffer.

---
**Developed by thebanri**
