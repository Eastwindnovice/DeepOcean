# DeepOcean
<p align="center">
  <img width="313.5" height="313.5" alt="ChatGPT Image May 27, 2026, 06_27_53 PM" src="https://github.com/user-attachments/assets/1932df5c-a547-47c5-802b-dcc1ec1d8de8" />
</p>

<p align="center">
  <a href="./LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg" />
  </a>
  <img alt="Node Version" src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-blue" />
  <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Eastwindnovice/DeepOcean" />
  <img alt="GitHub forks" src="https://img.shields.io/github/forks/Eastwindnovice/DeepOcean" />
</p>


DeepOcean uses a cloud-based Qwen API Key. By telling DeepOcean your intent, it can drive and operate your computer to complete certain tasks.

## Table of Contents
- [Features](#features)
- [Demo](#demo)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Contributing](#contributing)
- [License](#license)


## Features
- ✅ Feature 1:
Enter your intent in the input box, then confirm it to execute. The system will call the cloud API key to drive computer operations.

- 🚧 Planned: Feature 2:
In the future, it should be able to convert speech to text in real time and display it in the central black subtitle box. After the user confirms the intended action, it can begin operating the co[...]

## Demo
Quickly summon the PC AI assistant using the shortcut Ctrl + Alt + I, then enter a command in the input box.
<p align="center">
  <img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/fd5f3427-68e3-47d6-a4c1-0168e9111cc5" />
</p>

When you click the middle box to confirm execution, the agent will automatically open the Chrome browser and search for Python.
<p align="center">
  <img width="1127" height="832" alt="image" src="https://github.com/user-attachments/assets/8defff28-5284-4e6b-a8b7-aec90a40cf0a" />
</p>

## Requirements
- OS: Windows 10/11
- Node.js 18+
- Python >= 3.8
- uv、npm
- The backend requires a Qwen DashScope API key (example in agent-svc/.env.example). You need to configure the Qwen API Key website link: [https://bailian.console.aliyun.com/](https://bailian.cons[...]

## Quick Start
1. Clone the repositor
```bash
git clone https://github.com/Eastwindnovice/DeepOcean.git
```
2. Install dependencies
If you don’t have a UV environment, please install UV first by running `pip install uv`.
Then perform the following operations(Use **uv + pyproject.toml** as the source of truth.):
```bash
cd .\agent-svc
uv sync
```
Then go to the `desktop` directory and install the corresponding dependencies.
```bash
cd ..
cd .\desktop
npm install 
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env and add your API key
```

4. Run the project
```bash
# cd .\agent-svc
uv run python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Open another terminal.
# cd .\desktop
npm run dev
```

5. Use the project to perform operations
After both the frontend and backend have started, you can quickly summon the AI assistant using the `Ctrl + Alt + I` shortcut. Then enter the command you want to execute and confirm it.If you want to exit the current agent application process, you can simply press the ESC key to exit the current project application.


## Contributing
Contributions are welcome!
- To submit an issue: please include system information, reproduction steps, and logs.
- If you would like to contribute, please submit a PR.

## License
This project is licensed under the [MIT License](./LICENSE).
