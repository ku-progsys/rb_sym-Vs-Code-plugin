// extension.ts
// VS Code extension entrypoint for "rubysyn-extension.codeGen"
import * as vscode from "vscode";
import * as fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
import * as Path from "path";

function ensureUriFromContext(uri?: vscode.Uri): vscode.Uri | undefined {
  if (uri) {
    return uri;
  }
  const ed = vscode.window.activeTextEditor;
  return ed?.document?.uri;
}

async function runRbSyn(filePath: string) {
  const cfg = () => vscode.workspace.getConfiguration("myExt");
  const server = cfg().get<string>("server", "Hello");

  const endpoint = server + "/run_rbsyn";
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
    headers: form.getHeaders(), // Important!
  });

  if (!response.ok) {
    vscode.window.showErrorMessage(
      `Server error: ${response.status} ${response.statusText}`
    );
    return;
  }

  const rubyCode = await response.text();

  save_to_file(filePath, rubyCode);
}

function save_to_file(filePath: string, rubyCode: string) {
  const dir = Path.dirname(filePath);
  const base = Path.basename(filePath, Path.extname(filePath));
  const newFilePath = Path.join(dir, base + "_synthesized.rb");

  fs.writeFileSync(newFilePath, rubyCode);
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "rubysyn-extension.codeGen",
    async (clickedUri?: vscode.Uri) => {
      try {
        const fileUri = ensureUriFromContext(clickedUri);
        if (!fileUri) {
          vscode.window.showErrorMessage("No file selected or active.");
          return;
        }

        if (fileUri.scheme !== "file") {
          vscode.window.showErrorMessage("Only local files are supported.");
          return;
        }

        if (!fileUri) {
          return;
        }

        console.log("Uploading:", fileUri.fsPath);
        await runRbSyn(fileUri.fsPath);
      } catch (e: any) {
        console.log(e?.message ?? e);
        vscode.window.showErrorMessage(`RbSyn failed to start, check console!`);
      }
    }
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
