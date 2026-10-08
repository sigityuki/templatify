import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Helper function to convert strings into different casing conventions
function convertCase(str: string, convention: string): string {
    const words = str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[\s_-]+/g, ' ')
        .trim()
        .split(' ');

    if (words.length === 0 || words[0] === '') return str;

    switch (convention) {
        case 'PascalCase':
            return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        case 'camelCase':
            return words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        case 'snake_case':
            return words.map(w => w.toLowerCase()).join('_');
        case 'kebab-case':
            return words.map(w => w.toLowerCase()).join('-');
        case 'Original':
        default:
            return str;
    }
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('templatify.generate', async (uri: vscode.Uri) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace or project first!');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const templatesDir = path.join(rootPath, '.templates');
        const yamlConfigPath = path.join(rootPath, 'templatify.yaml');

        // 1. Automatically create .templates directory if it does not exist
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
            fs.writeFileSync(
                path.join(templatesDir, '${FILENAME}_usecase.dart.template | Default empty usecase template'), 
                '// Empty usecase template for ${CLASS}\n'
            );
        }

        // 2. Automatically create templatify.yaml in the root directory if it does not exist
        if (!fs.existsSync(yamlConfigPath)) {
            const defaultConfig = `# Templatify Configuration
# Available casing options: PascalCase, camelCase, snake_case, kebab-case, Original

naming:
  filename: kebab-case
  class: PascalCase
  property: camelCase
`;
            fs.writeFileSync(yamlConfigPath, defaultConfig, 'utf8');
        }

        // 3. Read and parse templatify.yaml configuration
        let namingRules = {
            filename: 'kebab-case',
            class: 'PascalCase',
            property: 'camelCase'
        };

        try {
            const yamlFileContent = fs.readFileSync(yamlConfigPath, 'utf8');
            const parsedConfig: any = yaml.load(yamlFileContent);
            if (parsedConfig && parsedConfig.naming) {
                namingRules.filename = parsedConfig.naming.filename || namingRules.filename;
                namingRules.class = parsedConfig.naming.class || namingRules.class;
                namingRules.property = parsedConfig.naming.property || namingRules.property;
            }
        } catch (error) {
            vscode.window.showWarningMessage('Failed to read templatify.yaml, using default rules.');
        }

        // Read items inside the .templates folder
        const templateItems = fs.readdirSync(templatesDir);
        if (templateItems.length === 0) {
            vscode.window.showErrorMessage('No templates found in the .templates folder!');
            return;
        }

        // 4. Map items to QuickPickItem with custom descriptions parsed via "|"
        const quickPickItems: any[] = templateItems.map(item => {
            const fullPath = path.join(templatesDir, item);
            const isDir = fs.statSync(fullPath).isDirectory();
            
            let description = isDir ? 'Folder Template Structure' : 'File Template';
            let label = item;

            if (item.includes('|')) {
                const parts = item.split('|').map(p => p.trim());
                label = parts[1];
                description = parts[0];
            }

            return {
                label: label,
                description: description,
                originalName: item // Original folder/file name including potential pipe and placeholders
            };
        });

        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: 'Select a Templatify template',
            matchOnDescription: true
        });

        if (!selected) return;

        const selectedTemplateName = selected.originalName;
        const selectedTemplatePath = path.join(templatesDir, selectedTemplateName);
        const stats = fs.statSync(selectedTemplatePath);

        const inputName = await vscode.window.showInputBox({
            prompt: stats.isDirectory() 
                ? 'Enter base name for the folder structure (e.g., user profile)' 
                : 'Enter base name for the file (e.g., user profile)',
            placeHolder: 'Base name...'
        });
        if (!inputName) return;

        const targetFolder = uri ? uri.fsPath : rootPath;
        
        // Generate specific names based on the 3 YAML rules
        const formattedFilename = convertCase(inputName, namingRules.filename);
        const formattedClass = convertCase(inputName, namingRules.class);
        const formattedProperty = convertCase(inputName, namingRules.property);

        // Helper to replace placeholders inside template contents
        const processTemplateContent = (content: string) => {
            return content
                .replace(/\$\{FILENAME\}/g, formattedFilename)
                .replace(/\$\{CLASS\}/g, formattedClass)
                .replace(/\$\{PROPERTY\}/g, formattedProperty)
                .replace(/\$\{NAME\}/g, formattedClass); // Backward compatibility
        };

        // Helper to replace placeholders in template file/folder names (and strip .template / description pipe)
        const processTemplateName = (name: string) => {
            // Take part before "|" if description exists
            let cleanName = name.split('|')[0].trim();
            // Remove .template suffix if exists
            if (cleanName.endsWith('.template')) {
                cleanName = cleanName.slice(0, -9);
            }

            return cleanName
                .replace(/\$\{FILENAME\}/g, formattedFilename)
                .replace(/\$\{CLASS\}/g, formattedClass)
                .replace(/\$\{PROPERTY\}/g, formattedProperty)
                .replace(/\$\{NAME\}/g, formattedClass);
        };

        const copyTemplateRecursive = (srcDir: string, destDir: string) => {
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            const entries = fs.readdirSync(srcDir, { withFileTypes: true });
            if (entries.length === 0) return;

            for (let entry of entries) {
                const srcPath = path.join(srcDir, entry.name);
                const processedName = processTemplateName(entry.name);
                const destPath = path.join(destDir, processedName);

                if (entry.isDirectory()) {
                    copyTemplateRecursive(srcPath, destPath);
                } else {
                    if (fs.existsSync(destPath)) {
                        vscode.window.showWarningMessage(`File ${processedName} already exists, skipped.`);
                        continue;
                    }
                    let content = fs.readFileSync(srcPath, 'utf8');
                    content = processTemplateContent(content);
                    fs.writeFileSync(destPath, content, 'utf8');
                }
            }
        };

        if (stats.isDirectory()) {
            const processedDirName = processTemplateName(selectedTemplateName);
            const targetDirPath = path.join(targetFolder, processedDirName);
            
            if (fs.existsSync(targetDirPath)) {
                vscode.window.showErrorMessage('Target folder with this name already exists!');
                return;
            }

            copyTemplateRecursive(selectedTemplatePath, targetDirPath);
            vscode.window.showInformationMessage(`Templatify: Successfully created folder ${processedDirName}!`);

        } else {
            const processedFileName = processTemplateName(selectedTemplateName);
            const targetFilePath = path.join(targetFolder, processedFileName);

            if (fs.existsSync(targetFilePath)) {
                vscode.window.showErrorMessage('File already exists in this directory!');
                return;
            }

            let content = fs.readFileSync(selectedTemplatePath, 'utf8');
            content = processTemplateContent(content);
            fs.writeFileSync(targetFilePath, content, 'utf8');

            const doc = await vscode.workspace.openTextDocument(targetFilePath);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(`Templatify: Successfully created ${processedFileName}!`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}