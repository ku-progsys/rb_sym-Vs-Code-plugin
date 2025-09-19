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
  console.log("Received Ruby code:", rubyCode);
  showInSplitView(rubyCode);
}

async function showInSplitView(rubyCode: string) {
  const newFile = await vscode.workspace.openTextDocument({
    content: rubyCode,
    language: "ruby",
  });
  vscode.window.showTextDocument(newFile, vscode.ViewColumn.Beside);
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
