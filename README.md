# AI Code Assistant

A powerful VS Code extension powered by Google's Gemini AI that helps you write, understand, and improve your code.

**Author:** Abhishek Tiwary

## Features

The extension provides several AI-powered commands to help you with your coding tasks:

### Code Creation and Refactoring
- **Create/Refactor Code**: Generate new code or refactor existing code based on your description
- **Suggest Further Code**: Get suggestions for improving or extending your existing code

### Code Understanding
- **Ask/Explain Code**: Ask questions about your code or get explanations of how it works
- **Fix/Debug Code**: Get help identifying and fixing bugs in your code

### Code Quality and Documentation
- **Generate Documentation**: Automatically generate comprehensive documentation for your code
- **Code Review**: Get AI-powered code review suggestions for improvements
- **Generate Unit Tests**: Create comprehensive unit tests for your code
- **Analyze Code Complexity**: Get insights about code complexity and suggestions for improvement

### Code Translation
- **Translate Code**: Convert code between different programming languages while maintaining functionality

## Requirements

- Visual Studio Code 1.85.0 or higher
- A Gemini API key (get it from https://makersuite.google.com/app/apikey)

## Extension Settings

This extension contributes the following settings:

* `gemini.apiKey`: Your Gemini API key. Get it from https://makersuite.google.com/app/apikey

## Usage

1. Install the extension
2. Get your Gemini API key from https://makersuite.google.com/app/apikey
3. When you first use any command, you'll be prompted to enter your API key
4. Select code in your editor or open a file
5. Use the Command Palette (Ctrl+Shift+P or Cmd+Shift+P) and type "Gemini:" to see all available commands
6. Choose a command and follow the prompts

## Features in Detail

### Create/Refactor Code
Select code and use this command to get AI suggestions for refactoring, or use it without selection to generate new code based on your description.

### Ask/Explain Code
Select code and use this command to get explanations of how it works, or ask specific questions about the code.

### Fix/Debug Code
Select code containing bugs and use this command to get help identifying and fixing issues.

### Suggest Further Code
Select code and use this command to get suggestions for improvements or extensions to your code.

### Generate Documentation
Select code and use this command to automatically generate comprehensive documentation including:
- Function/class/module purpose
- Parameters and return values
- Usage examples
- Important notes

### Code Review
Select code and use this command to get a thorough code review including:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Suggestions for improvement

### Generate Unit Tests
Select code and use this command to generate comprehensive unit tests including:
- Test cases for normal operation
- Edge cases
- Error cases
- Mocking suggestions

### Translate Code
Select code and use this command to translate it to another programming language. The translation will:
- Maintain the same functionality
- Include explanatory comments
- Follow the target language's best practices

### Analyze Code Complexity
Select code and use this command to get insights about:
- Time and space complexity
- Cyclomatic complexity
- Code maintainability
- Suggestions for simplification

## Known Issues

None at the moment.

## Release Notes

### 1.0.0
- Initial release with basic code generation and explanation features

### 1.1.0
- Added code documentation generation
- Added code review capabilities
- Added unit test generation
- Added code translation between languages
- Added code complexity analysis

## Contributing

Feel free to open issues or submit pull requests on our GitHub repository.

## License

This extension is licensed under the MIT License - see the LICENSE file for details.

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
