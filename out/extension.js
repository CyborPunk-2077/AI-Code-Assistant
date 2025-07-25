"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const generative_ai_1 = require("@google/generative-ai");
// Status bar item for extension status
let statusBarItem;
// Function to set API key
async function setApiKey(context) {
    try {
        const config = vscode.workspace.getConfiguration('gemini');
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Gemini API key',
            placeHolder: 'Paste your API key here',
            password: true,
            ignoreFocusOut: true,
            validateInput: text => {
                return text && text.length > 0 ? null : 'API key cannot be empty';
            }
        });
        if (apiKey) {
            // Save to both global state and settings
            await context.globalState.update('geminiApiKey', apiKey);
            await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
            // Update UI state
            vscode.commands.executeCommand('setContext', 'gemini.hasApiKey', true);
            updateStatusBarItem(context, true);
            vscode.window.showInformationMessage('API key saved successfully!');
            return apiKey;
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to save API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return undefined;
}
// Function to get the API key from global state or settings
async function getApiKey(context) {
    // First try global state
    let apiKey = context.globalState.get('geminiApiKey');
    if (!apiKey) {
        // Then try settings
        const config = vscode.workspace.getConfiguration('gemini');
        apiKey = config.get('apiKey');
        if (apiKey) {
            // If found in settings, save to global state for faster access
            await context.globalState.update('geminiApiKey', apiKey);
        }
        else {
            const action = await vscode.window.showErrorMessage('Gemini API key is required to use this extension.', 'Set API Key', 'Get API Key');
            if (action === 'Get API Key') {
                vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
                return undefined;
            }
            else if (action === 'Set API Key') {
                return await setApiKey(context);
            }
        }
    }
    // Update the context variable for menu visibility
    vscode.commands.executeCommand('setContext', 'gemini.hasApiKey', !!apiKey);
    return apiKey;
}
// Function to get selected code or prompt for input
async function getCodeOrPrompt(editor, promptMessage) {
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (selectedText) {
        return selectedText;
    }
    return await vscode.window.showInputBox({
        prompt: promptMessage,
        placeHolder: 'Enter your request...',
        ignoreFocusOut: true
    });
}
// Function to call Gemini API
async function callGemini(apiKey, prompt) {
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    catch (error) {
        console.error('Gemini API Error:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Function to show progress notification
async function withProgress(title, task) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0 });
        const result = await task();
        progress.report({ increment: 100 });
        return result;
    });
}
// Function to create and show welcome view
async function showWelcomeView(context) {
    const panel = vscode.window.createWebviewPanel('aiCodeAssistWelcome', 'Welcome to AI Code Assistant', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
    panel.webview.html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				:root {
					--primary: #4D9DE0;
					--primary-hover: #3B87C8;
					--success: #56B786;
					--card-bg: var(--vscode-editor-background);
					--border: var(--vscode-widget-border);
					--text: var(--vscode-editor-foreground);
				}

				body {
					font-family: system-ui, -apple-system, sans-serif;
					padding: 0;
					color: var(--text);
					line-height: 1.6;
					margin: 0;
					background: var(--card-bg);
				}

				.container {
					max-width: 900px;
					margin: 0 auto;
					padding: 24px;
				}

				.header {
					text-align: center;
					margin-bottom: 40px;
					padding: 32px 0;
					background: var(--vscode-editor-background);
					border-bottom: 1px solid var(--border);
				}

				.header img {
					width: 80px;
					height: 80px;
					margin-bottom: 16px;
				}

				.header h1 {
					margin: 0;
					font-size: 2.4em;
					color: var(--primary);
				}

				.header p {
					margin: 8px 0 0;
					opacity: 0.8;
				}

				.feature-list {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
					gap: 24px;
					margin: 32px 0;
				}

				.feature-card {
					background: var(--vscode-editor-background);
					padding: 24px;
					border-radius: 12px;
					border: 1px solid var(--border);
					transition: all 0.3s ease;
				}

				.feature-card:hover {
					transform: translateY(-4px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
					border-color: var(--primary);
				}

				.feature-icon {
					width: 40px;
					height: 40px;
					margin-bottom: 16px;
					color: var(--primary);
				}

				.quick-start {
					margin-top: 40px;
					padding: 32px;
					background: var(--vscode-editor-background);
					border-radius: 12px;
					border: 1px solid var(--border);
				}

				.quick-start h2 {
					margin-top: 0;
					color: var(--primary);
				}

				.button {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 10px 20px;
					background: var(--primary);
					color: white;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					text-decoration: none;
					font-weight: 500;
					transition: all 0.2s ease;
				}

				.button:hover {
					background: var(--primary-hover);
					transform: translateY(-1px);
				}

				.button svg {
					width: 16px;
					height: 16px;
				}

				.command-list {
					margin-top: 24px;
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 16px;
				}

				.command-item {
					padding: 12px;
					background: var(--vscode-editor-background);
					border: 1px solid var(--border);
					border-radius: 6px;
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.command-icon {
					width: 20px;
					height: 20px;
					color: var(--primary);
				}

				@keyframes pulse {
					0% { transform: scale(1); }
					50% { transform: scale(1.05); }
					100% { transform: scale(1); }
				}

				.highlight {
					animation: pulse 2s infinite;
					color: var(--primary);
				}
			</style>
		</head>
		<body>
			<div class="header">
				<img src="https://raw.githubusercontent.com/microsoft/vscode-icons/master/icons/dark/extensions.svg" alt="AI Code Assistant Logo">
				<h1>Welcome to AI Code Assistant</h1>
				<p>Your intelligent coding companion powered by Google's Gemini AI</p>
			</div>
			
			<div class="container">
				<div class="quick-start">
					<h2>🚀 Quick Start</h2>
					<ol>
						<li>Get your API key from <a href="https://makersuite.google.com/app/apikey" class="highlight">Google AI Studio</a></li>
						<li>Press <code>Ctrl+Shift+P</code> (<code>Cmd+Shift+P</code> on Mac) and type "AI Code Assist"</li>
						<li>Select any command and start coding smarter!</li>
					</ol>
					<button class="button" onclick="setApiKey()">
						<svg viewBox="0 0 16 16" fill="currentColor">
							<path d="M14 5.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zm-1 0a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0z"/>
							<path d="M8.5 7.5a5 5 0 0 0-5 5v1h1v-1a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1h1v-1a5 5 0 0 0-5-5h-1z"/>
						</svg>
						Set API Key
					</button>
				</div>

				<h2>✨ Features</h2>
				<div class="feature-list">
					<div class="feature-card">
						<svg class="feature-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/>
							<path d="M8 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/>
						</svg>
						<h3>Code Creation & Refactoring</h3>
						<ul>
							<li>Generate new code</li>
							<li>Refactor existing code</li>
							<li>Get improvement suggestions</li>
						</ul>
					</div>
					<div class="feature-card">
						<svg class="feature-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
							<path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
						</svg>
						<h3>Code Understanding</h3>
						<ul>
							<li>Get code explanations</li>
							<li>Ask questions about code</li>
							<li>Debug and fix issues</li>
						</ul>
					</div>
					<div class="feature-card">
						<svg class="feature-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
							<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
						</svg>
						<h3>Code Quality</h3>
						<ul>
							<li>Generate documentation</li>
							<li>Code review assistance</li>
							<li>Generate unit tests</li>
						</ul>
					</div>
					<div class="feature-card">
						<svg class="feature-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
						</svg>
						<h3>Advanced Features</h3>
						<ul>
							<li>Code translation</li>
							<li>Complexity analysis</li>
							<li>Best practices review</li>
						</ul>
					</div>
				</div>

				<div class="command-list">
					<div class="command-item">
						<svg class="command-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0z"/>
						</svg>
						<span>Create/Refactor Code</span>
					</div>
					<div class="command-item">
						<svg class="command-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
							<path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
						</svg>
						<span>Ask/Explain Code</span>
					</div>
					<div class="command-item">
						<svg class="command-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
							<path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
						</svg>
						<span>Fix/Debug Code</span>
					</div>
					<div class="command-item">
						<svg class="command-icon" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
							<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
						</svg>
						<span>Suggest More</span>
					</div>
				</div>
			</div>
			<script>
				function setApiKey() {
					vscode.postMessage({ command: 'setApiKey' });
				}

				// Add hover effects
				document.querySelectorAll('.feature-card').forEach(card => {
					card.addEventListener('mouseenter', () => {
						card.style.transform = 'translateY(-4px)';
					});
					card.addEventListener('mouseleave', () => {
						card.style.transform = 'translateY(0)';
					});
				});
			</script>
		</body>
		</html>
	`;
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'setApiKey') {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Gemini API key:',
                placeHolder: 'Get it from https://makersuite.google.com/app/apikey',
                ignoreFocusOut: true
            });
            if (apiKey) {
                await context.globalState.update('geminiApiKey', apiKey);
                vscode.window.showInformationMessage('API key saved successfully!');
                updateStatusBarItem(context, true);
            }
        }
    });
}
// Function to update status bar item with animations
function updateStatusBarItem(context, isConfigured) {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'aiCodeAssist.showWelcome';
        context.subscriptions.push(statusBarItem);
    }
    const icon = isConfigured ? '$(check)' : '$(warning)';
    const text = isConfigured ? 'AI Code Assist' : 'AI Code Assist: Set API Key';
    const tooltip = isConfigured ?
        'AI Code Assistant is ready\nClick to open welcome page' :
        'Click to set up AI Code Assistant';
    statusBarItem.text = `${icon} ${text}`;
    statusBarItem.tooltip = tooltip;
    statusBarItem.backgroundColor = isConfigured ? undefined : new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();
}
// Function to display response
async function displayResponse(response, editor) {
    const panel = vscode.window.createWebviewPanel('aiCodeAssistResponse', 'AI Code Assistant', vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: []
    });
    // Format the response with proper styling and syntax highlighting
    const formattedResponse = response
        .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        const lang = language || 'plaintext';
        const hasEditor = editor ? '' : 'disabled';
        const escapedCode = code.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        return `<div class="code-block" data-lang="${lang}">
				<div class="code-header">
					<div class="lang-indicator">
						<span class="lang-dot"></span>
						<span class="language-tag">${lang}</span>
					</div>
					<div class="code-actions">
						<button class="action-button apply-button" onclick="applyCode(this)" ${hasEditor} data-code="${encodeURIComponent(code.trim())}">Apply</button>
						<button class="action-button copy-button" onclick="copyCode(this)">Copy</button>
					</div>
				</div>
				<pre><code class="language-${lang}">${escapedCode}</code></pre>
			</div>`;
    })
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/`([^`]+)`/g, (match, code) => {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        return `<code>${escapedCode}</code>`;
    });
    // Optimized styles with only essential CSS
    const styles = `
		:root {
			--primary: #4D9DE0;
			--primary-hover: #3B87C8;
			--success: #56B786;
			--header: #1E293B;
			--bg: #0F172A;
			--border: #2D3B55;
			--code-bg: #1A2234;
			--radius: 8px;
			--pad: 16px;
		}

		body {
			font-family: system-ui, -apple-system, sans-serif;
			padding: var(--pad);
			color: #E2E8F0;
			background: var(--bg);
			line-height: 1.6;
			margin: 0 auto;
			max-width: 1200px;
		}

		.response-container {
			background: var(--bg);
			border-radius: var(--radius);
			border: 1px solid var(--border);
			overflow: hidden;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		}

		.response-header {
			background: var(--header);
			padding: var(--pad);
			border-bottom: 1px solid var(--border);
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.response-header h2 {
			font-size: 1.2em;
			font-weight: 600;
			color: #E2E8F0;
			margin: 0;
		}

		.response-content { 
			padding: var(--pad);
			font-size: 15px;
		}

		.code-block {
			margin: var(--pad) 0;
			background: var(--code-bg);
			border-radius: var(--radius);
			border: 1px solid var(--border);
			overflow: hidden;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
			transition: all 0.3s ease;
		}

		.code-block:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
			border-color: var(--primary);
			transform: translateY(-1px);
		}

		.code-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 12px var(--pad);
			background: var(--header);
			border-bottom: 1px solid var(--border);
		}

		.lang-indicator {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.lang-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: var(--primary);
			box-shadow: 0 0 8px var(--primary);
		}

		.language-tag {
			color: #94A3B8;
			font-size: 0.9em;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			font-weight: 500;
		}

		.code-actions {
			display: flex;
			gap: 8px;
		}

		.action-button {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 6px 14px;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 0.9em;
			font-weight: 500;
			background: var(--primary);
			color: white;
			transition: all 0.2s ease;
		}

		.action-button svg {
			width: 14px;
			height: 14px;
			fill: currentColor;
		}

		.action-button:hover:not(:disabled) {
			opacity: 0.9;
			transform: translateY(-1px);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		.action-button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.apply-button { 
			background: var(--success);
		}

		.apply-button:hover:not(:disabled) {
			background: #419E6A;
		}

		pre {
			margin: 0;
			padding: var(--pad);
			overflow-x: auto;
			font-size: 14px;
			line-height: 1.5;
			background: var(--code-bg);
			border-radius: 0 0 var(--radius) var(--radius);
		}

		pre::-webkit-scrollbar {
			height: 8px;
			background: var(--code-bg);
		}

		pre::-webkit-scrollbar-thumb {
			background: var(--border);
			border-radius: 4px;
		}

		pre::-webkit-scrollbar-thumb:hover {
			background: var(--primary);
		}

		code {
			font-family: 'JetBrains Mono', 'SF Mono', Monaco, Menlo, Consolas, monospace;
			font-size: 14px;
			tab-size: 4;
			white-space: pre;
			word-spacing: normal;
			word-break: normal;
			line-height: 1.5;
			display: block;
		}

		.code-block pre code {
			padding: 0;
			margin: 0;
			background: none;
			border: none;
			color: inherit;
		}

		p { margin: var(--pad) 0; }

		.success-toast {
			position: fixed;
			top: var(--pad);
			right: var(--pad);
			background: var(--success);
			color: white;
			padding: 10px 20px;
			border-radius: var(--radius);
			transform: translateY(-100%);
			opacity: 0;
			transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			display: flex;
			align-items: center;
			gap: 8px;
			font-weight: 500;
		}

		.success-toast.show {
			transform: translateY(0);
			opacity: 1;
		}

		@media (max-width: 768px) {
			body {
				padding: 12px;
			}
			
			.code-block {
				margin: 12px -12px;
				border-radius: 0;
			}
		}
	`;
    // Updated HTML structure with fixed script
    panel.webview.html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>${styles}</style>
		</head>
		<body>
			<div class="response-container">
				<div class="response-header">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76zM16 8L2 22M17.5 15H9" />
					</svg>
					<h2>AI Assistant Response</h2>
				</div>
				<div class="response-content">
					${formattedResponse}
				</div>
			</div>
			<div id="successToast" class="success-toast">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
				</svg>
				Changes applied successfully!
			</div>
			<script>
				const vscode = acquireVsCodeApi();
				
				const showToast = () => {
					const toast = document.getElementById('successToast');
					toast.classList.add('show');
					setTimeout(() => toast.classList.remove('show'), 2000);
				};

				const copyCode = (button) => {
					const code = button.closest('.code-block').querySelector('code').textContent;
					navigator.clipboard.writeText(code);
					button.innerHTML = \`
						<svg viewBox="0 0 16 16" fill="currentColor">
							<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
						</svg>
						Copied!\`;
					setTimeout(() => {
						button.innerHTML = \`
							<svg viewBox="0 0 16 16" fill="currentColor">
								<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25v-7.5z"/>
								<path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25v-7.5zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5z"/>
							</svg>
							Copy\`;
					}, 2000);
				};

				const applyCode = (button) => {
					const code = decodeURIComponent(button.getAttribute('data-code'));
					vscode.postMessage({ 
						command: 'applyCode',
						code: code
					});
					
					button.innerHTML = \`
						<svg viewBox="0 0 16 16" fill="currentColor">
							<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
						</svg>
						Applied!\`;
					showToast();
					setTimeout(() => {
						button.innerHTML = \`
							<svg viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm4.879-2.773l4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215z"/>
							</svg>
							Apply\`;
					}, 2000);
				};

				// Load syntax highlighting with a modern theme
				const loadHighlighting = () => {
					const script = document.createElement('script');
					script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
					script.onload = () => {
						const style = document.createElement('link');
						style.rel = 'stylesheet';
						style.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
						document.head.appendChild(style);
						hljs.configure({ 
							ignoreUnescapedHTML: true,
							languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust']
						});
						document.querySelectorAll('pre code').forEach((el) => {
							hljs.highlightElement(el);
						});
					};
					document.head.appendChild(script);
				};

				// Initialize
				if (document.querySelector('code')) {
					loadHighlighting();
				}
			</script>
		</body>
		</html>
	`;
    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'applyCode' && editor) {
            try {
                await editor.edit(editBuilder => {
                    if (editor.selection.isEmpty) {
                        // If no selection, insert at cursor position
                        editBuilder.insert(editor.selection.active, message.code);
                    }
                    else {
                        // If there's a selection, replace it
                        editBuilder.replace(editor.selection, message.code);
                    }
                });
                // Show success message
                vscode.window.showInformationMessage('Code applied successfully!');
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to apply code: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    });
}
// Function to generate documentation for code
async function generateDocumentation(apiKey, code, language) {
    const prompt = `Generate comprehensive documentation for this ${language} code. Include:\n` +
        `1. Function/class/module purpose\n` +
        `2. Parameters and return values\n` +
        `3. Usage examples\n` +
        `4. Any important notes\n\nCode:\n${code}`;
    return await callGemini(apiKey, prompt);
}
// Function to perform code review
async function performCodeReview(apiKey, code, language) {
    const prompt = `Perform a code review on this ${language} code. Consider:\n` +
        `1. Code quality and best practices\n` +
        `2. Potential bugs or issues\n` +
        `3. Performance considerations\n` +
        `4. Security concerns\n` +
        `5. Suggestions for improvement\n\nCode:\n${code}`;
    return await callGemini(apiKey, prompt);
}
// Function to generate test cases
async function generateTestCases(apiKey, code, language) {
    const prompt = `Generate comprehensive unit tests for this ${language} code. Include:\n` +
        `1. Test cases for normal operation\n` +
        `2. Edge cases\n` +
        `3. Error cases\n` +
        `4. Mocking suggestions if needed\n\nCode:\n${code}`;
    return await callGemini(apiKey, prompt);
}
// Function to translate code between languages
async function translateCode(apiKey, code, sourceLanguage, targetLanguage) {
    const prompt = `Translate this ${sourceLanguage} code to ${targetLanguage}. 
Format your response as follows:

1. Brief explanation of the translation approach
2. Original code in a code block with the source language
3. Translated code in a code block with the target language
4. Comments explaining key translation decisions

Here's the code to translate:

${code}`;
    return await callGemini(apiKey, prompt);
}
// Function to analyze code complexity
async function analyzeComplexity(apiKey, code, language) {
    const prompt = `Analyze the complexity of this ${language} code. Consider:\n` +
        `1. Time and space complexity\n` +
        `2. Cyclomatic complexity\n` +
        `3. Code maintainability\n` +
        `4. Suggestions for simplification\n\nCode:\n${code}`;
    return await callGemini(apiKey, prompt);
}
// Function to fix errors in code
async function fixErrors(apiKey, code, language) {
    // First, create a focused prompt for syntax and basic errors
    const prompt = `Fix ONLY syntax and basic errors in this ${language} code. Focus on:
1. Missing semicolons, brackets, or parentheses
2. Basic syntax errors
3. Variable declaration issues
4. Simple typos
5. Basic indentation problems

Return ONLY the fixed code without explanations. Preserve all functionality and only fix syntax/basic errors:

${code}`;
    try {
        // Get the initial fix focusing on syntax
        const fixedCode = await callGemini(apiKey, prompt);
        return fixedCode;
    }
    catch (error) {
        console.error('Error fixing code:', error);
        throw error;
    }
}
// Function to get diagnostics (errors) for a document
function getDiagnostics(document) {
    const allDiagnostics = vscode.languages.getDiagnostics(document.uri);
    // Filter and sort diagnostics to prioritize syntax errors
    return allDiagnostics.sort((a, b) => {
        // Prioritize syntax errors (usually severity 1) over warnings
        if (a.severity !== b.severity) {
            return a.severity - b.severity;
        }
        // For same severity, prioritize errors in earlier lines
        return a.range.start.line - b.range.start.line;
    });
}
// Function to apply fix to the document
async function applyErrorFix(document, edit, fixedCode) {
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    // Only apply the fix if the code has actually changed
    if (fixedCode !== document.getText()) {
        edit.replace(document.uri, fullRange, fixedCode);
        await vscode.workspace.applyEdit(edit);
        // Show what was fixed
        const diagnostics = getDiagnostics(document);
        if (diagnostics.length > 0) {
            const fixedErrors = diagnostics.map(d => d.message).join('\n- ');
            vscode.window.showInformationMessage(`Fixed errors:\n- ${fixedErrors}`);
        }
    }
}
// Function to provide real-time suggestions
async function provideSuggestions(document, position, context, apiKey) {
    try {
        // Check if suggestions are enabled
        const config = vscode.workspace.getConfiguration('gemini');
        if (!config.get('suggestions.enabled')) {
            return [];
        }
        // Get the current line and preceding lines for context
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const prevLines = [];
        // Get more context from imports and declarations
        const importLines = [];
        const declarationLines = [];
        // Gather context from up to 20 lines before current position
        for (let i = Math.max(0, position.line - 20); i < position.line; i++) {
            const line = document.lineAt(i).text;
            if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
                importLines.push(line);
            }
            else if (line.includes('class ') || line.includes('function ') || line.includes('const ') || line.includes('let ')) {
                declarationLines.push(line);
            }
            else if (i >= position.line - 5) {
                prevLines.push(line);
            }
        }
        // Get the language ID for language-specific suggestions
        const languageId = document.languageId;
        // Create context-aware prompt
        const prompt = `As a code completion provider for ${languageId}, suggest completions for this code:

${importLines.length > 0 ? '// Imports\n' + importLines.join('\n') : ''}
${declarationLines.length > 0 ? '\n// Relevant declarations\n' + declarationLines.join('\n') : ''}
${prevLines.length > 0 ? '\n// Recent code\n' + prevLines.join('\n') : ''}
${linePrefix}

Provide 5 most relevant code completions. Format each as: "completion|label|detail" where:
- completion: The actual code to insert
- label: Short description (1-3 words)
- detail: Longer explanation

Example format:
map(item => )|Array Map|Transform each array element
filter(pred => )|Array Filter|Filter array elements by condition

Consider:
1. Language-specific syntax and patterns
2. Common coding patterns
3. Variable and function names in scope
4. Type-appropriate completions
5. Best practices for ${languageId}`;
        // Get suggestions from Gemini
        const response = await callGemini(apiKey, prompt);
        // Process and filter suggestions
        const suggestions = response.split('\n')
            .filter(line => line.includes('|'))
            .map(line => {
            const [completion, label, detail] = line.split('|').map(s => s.trim());
            if (!completion || !label)
                return null;
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(completion);
            item.detail = detail || label;
            item.documentation = new vscode.MarkdownString(detail || label);
            item.sortText = '0'; // Prioritize our suggestions
            // Add kind based on the completion content
            if (completion.includes('=>')) {
                item.kind = vscode.CompletionItemKind.Function;
            }
            else if (completion.includes('class')) {
                item.kind = vscode.CompletionItemKind.Class;
            }
            else if (completion.includes('import')) {
                item.kind = vscode.CompletionItemKind.Module;
            }
            else if (completion.includes('(')) {
                item.kind = vscode.CompletionItemKind.Method;
            }
            else {
                item.kind = vscode.CompletionItemKind.Property;
            }
            return item;
        })
            .filter((item) => item !== null);
        return suggestions;
    }
    catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
    }
}
// Function to debounce API calls
function debounce(func, wait) {
    let timeout = null;
    let previousPromise = null;
    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        if (previousPromise) {
            return previousPromise;
        }
        return new Promise((resolve) => {
            timeout = setTimeout(async () => {
                timeout = null;
                try {
                    const result = await func(...args);
                    previousPromise = null;
                    resolve(result);
                }
                catch (error) {
                    previousPromise = null;
                    resolve(func(...args));
                }
            }, wait);
        });
    };
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    console.log('AI Code Assistant is now active!');
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'aiCodeAssist.showWelcome';
    context.subscriptions.push(statusBarItem);
    // Check if API key is configured
    const apiKey = context.globalState.get('geminiApiKey');
    updateStatusBarItem(context, !!apiKey);
    vscode.commands.executeCommand('setContext', 'gemini.hasApiKey', !!apiKey);
    // Register welcome view command
    let welcomeDisposable = vscode.commands.registerCommand('aiCodeAssist.showWelcome', () => {
        showWelcomeView(context);
    });
    // Register the toggle suggestions command first
    let toggleSuggestionsDisposable = vscode.commands.registerCommand('gemini.enableSuggestions', () => {
        const config = vscode.workspace.getConfiguration('gemini');
        const currentValue = config.get('suggestions.enabled', true);
        config.update('suggestions.enabled', !currentValue, vscode.ConfigurationTarget.Global).then(() => {
            vscode.window.showInformationMessage(`Real-time suggestions ${!currentValue ? 'enabled' : 'disabled'}`);
        });
    });
    // Initialize suggestion settings
    const config = vscode.workspace.getConfiguration('gemini');
    if (config.get('suggestions.enabled') === undefined) {
        config.update('suggestions.enabled', true, vscode.ConfigurationTarget.Global);
    }
    // Register the real-time suggestion provider
    const triggerChars = config.get('suggestions.triggerCharacters') || ['.', ' ', '(', ','];
    const debounceTime = config.get('suggestions.debounceTime') || 500;
    const debouncedSuggestions = debounce(provideSuggestions, debounceTime);
    const suggestionDisposable = vscode.languages.registerCompletionItemProvider(['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php'], {
        async provideCompletionItems(document, position, token, completionContext) {
            const apiKey = await getApiKey(context);
            if (!apiKey)
                return [];
            // Check if the trigger character is a comma
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            if (linePrefix.endsWith(',')) {
                // Get current diagnostics (errors)
                const diagnostics = getDiagnostics(document);
                if (diagnostics.length > 0) {
                    try {
                        // Show that we're fixing errors
                        vscode.window.showInformationMessage('Fixing syntax and basic errors...');
                        // Get the code with errors
                        const code = document.getText();
                        const language = document.languageId;
                        // Fix the errors
                        const fixedCode = await fixErrors(apiKey, code, language);
                        // Apply the fix
                        const edit = new vscode.WorkspaceEdit();
                        await applyErrorFix(document, edit, fixedCode);
                        // Return empty array since we've handled the completion
                        return [];
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Error fixing code: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        return [];
                    }
                }
            }
            return await debouncedSuggestions(document, position, completionContext, apiKey);
        }
    }, ...triggerChars);
    // Register all other commands
    let createRefactorDisposable = vscode.commands.registerCommand('gemini.createRefactor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const codeOrPrompt = await getCodeOrPrompt(editor, `Describe what ${language} code to create or how to refactor the selected code:`);
        if (!codeOrPrompt)
            return;
        try {
            const prompt = editor.selection.isEmpty
                ? `Write ${language} code for the following task: ${codeOrPrompt}`
                : `Refactor the following ${language} code to improve it:\n${codeOrPrompt}`;
            const response = await withProgress('Generating code...', () => callGemini(apiKey, prompt));
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the ask/explain command
    let askExplainDisposable = vscode.commands.registerCommand('gemini.askExplain', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const codeOrPrompt = await getCodeOrPrompt(editor, 'Ask a question about the code or enter code to explain:');
        if (!codeOrPrompt)
            return;
        try {
            const prompt = editor.selection.isEmpty
                ? codeOrPrompt
                : `Explain the following ${language} code:\n${codeOrPrompt}`;
            const response = await callGemini(apiKey, prompt);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the fix command
    let fixDisposable = vscode.commands.registerCommand('gemini.fix', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to fix.');
            return;
        }
        try {
            const prompt = `Find and fix any errors or issues in this ${language} code. Focus on syntax errors, logical errors, and code style issues:\n${code}`;
            const response = await withProgress('Fixing code...', () => callGemini(apiKey, prompt));
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the debug command
    let debugDisposable = vscode.commands.registerCommand('gemini.debug', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to debug.');
            return;
        }
        try {
            const prompt = `Debug this ${language} code. Analyze potential runtime issues, edge cases, and provide debugging suggestions with example test cases:\n${code}`;
            const response = await withProgress('Analyzing code for debugging...', () => callGemini(apiKey, prompt));
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the suggest more command
    let suggestMoreDisposable = vscode.commands.registerCommand('gemini.suggestMore', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select some code to get suggestions.');
            return;
        }
        try {
            const prompt = `How can I improve or extend this ${language} code?\n${code}`;
            const response = await callGemini(apiKey, prompt);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the generate documentation command
    let generateDocDisposable = vscode.commands.registerCommand('gemini.generateDoc', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to document.');
            return;
        }
        try {
            const response = await generateDocumentation(apiKey, code, language);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the code review command
    let codeReviewDisposable = vscode.commands.registerCommand('gemini.codeReview', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to review.');
            return;
        }
        try {
            const response = await performCodeReview(apiKey, code, language);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the generate tests command
    let generateTestsDisposable = vscode.commands.registerCommand('gemini.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to generate tests for.');
            return;
        }
        try {
            const response = await generateTestCases(apiKey, code, language);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the translate code command
    let translateCodeDisposable = vscode.commands.registerCommand('gemini.translateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const sourceLanguage = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to translate.');
            return;
        }
        const targetLanguage = await vscode.window.showQuickPick(['python', 'javascript', 'typescript', 'java', 'csharp', 'go', 'rust', 'cpp'], { placeHolder: 'Select target language' });
        if (!targetLanguage)
            return;
        try {
            const response = await translateCode(apiKey, code, sourceLanguage, targetLanguage);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the analyze complexity command
    let analyzeComplexityDisposable = vscode.commands.registerCommand('gemini.analyzeComplexity', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a file first.');
            return;
        }
        const apiKey = await getApiKey(context);
        if (!apiKey)
            return;
        const language = editor.document.languageId;
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showErrorMessage('Please select the code to analyze.');
            return;
        }
        try {
            const response = await analyzeComplexity(apiKey, code, language);
            await displayResponse(response, editor);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Register the set API key command
    let setApiKeyDisposable = vscode.commands.registerCommand('gemini.setApiKey', async () => {
        await setApiKey(context);
    });
    // Add all disposables to subscriptions
    context.subscriptions.push(welcomeDisposable, toggleSuggestionsDisposable, suggestionDisposable, createRefactorDisposable, askExplainDisposable, fixDisposable, debugDisposable, suggestMoreDisposable, generateDocDisposable, codeReviewDisposable, generateTestsDisposable, translateCodeDisposable, analyzeComplexityDisposable, setApiKeyDisposable);
    // Show welcome view on first activation if no API key is set
    if (!apiKey) {
        showWelcomeView(context);
    }
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map