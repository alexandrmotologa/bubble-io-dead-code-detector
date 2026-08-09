/**
 * Bubble.io Dead Code Detector — VS Code Extension
 *
 * Activation: right-click any .bubble file in Explorer → "Bubble: Run Dead Code Scan"
 *
 * Publishing to VS Code Marketplace:
 *   1. npm install -g @vscode/vsce
 *   2. vsce login <publisher>          (requires Microsoft account)
 *   3. vsce package                   (creates .vsix file for local install)
 *   4. vsce publish                   (publishes to Marketplace)
 */

import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

const execFileAsync = promisify(execFile);

// Output channel for all extension logs
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Bubble Dead Code Detector');
  context.subscriptions.push(outputChannel);

  // Diagnostics collection — populates VS Code Problems panel
  const diagnostics = vscode.languages.createDiagnosticCollection('bubble-dead-code');
  context.subscriptions.push(diagnostics);

  // ── Command: scan ──────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bubbleDetector.scan', async (uri?: vscode.Uri) => {
      const filePath = await resolveFilePath(uri);
      if (!filePath) return;
      await runScan(filePath, diagnostics, false, context);
    }),
  );

  // ── Command: scan + open HTML ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bubbleDetector.scanWithHtml', async (uri?: vscode.Uri) => {
      const filePath = await resolveFilePath(uri);
      if (!filePath) return;
      await runScan(filePath, diagnostics, true, context);
    }),
  );

  // ── Command: clean dry-run ─────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bubbleDetector.clean', async (uri?: vscode.Uri) => {
      const filePath = await resolveFilePath(uri);
      if (!filePath) return;
      await runClean(filePath);
    }),
  );
}

export function deactivate(): void {
  outputChannel?.dispose();
}

// ─── Core Functions ────────────────────────────────────────────────────────────

async function runScan(
  filePath: string,
  diagnostics: vscode.DiagnosticCollection,
  openHtml: boolean,
  context: vscode.ExtensionContext,
): Promise<void> {
  const config = vscode.workspace.getConfiguration('bubbleDetector');
  const minConfidence = config.get<string>('minConfidence', 'MEDIUM');
  const outputDir = config.get<string>('outputDir', './audit-results');
  const autoOpenHtml = config.get<boolean>('autoOpenHtml', true);

  const workspaceDir = dirname(filePath);
  const resolvedOutputDir = join(workspaceDir, outputDir.replace('./', ''));

  mkdirSync(resolvedOutputDir, { recursive: true });

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '🫧 Bubble: Running dead code scan...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Building dependency graph...' });

      const detectorBin = resolveDetectorBin(context);

      try {
        const { stdout } = await execFileAsync(
          'node',
          [
            detectorBin,
            'scan',
            '--file', filePath,
            '--json',
            '--min-confidence', minConfidence,
            '--output-dir', resolvedOutputDir,
            ...(openHtml || autoOpenHtml ? ['--html'] : []),
          ],
          { cwd: workspaceDir, timeout: 30000 },
        );

        outputChannel.appendLine('─── Scan Output ───────────────────────────────');
        outputChannel.appendLine(stdout);

        progress.report({ message: 'Loading findings...' });

        // Load JSON report and populate diagnostics
        const jsonReportPath = join(resolvedOutputDir, 'audit-report.json');
        if (existsSync(jsonReportPath)) {
          const report = JSON.parse(readFileSync(jsonReportPath, 'utf-8')) as ScanReport;
          populateDiagnostics(report, filePath, diagnostics);

          const score = report.healthScore?.score ?? 0;
          const grade = report.healthScore?.grade ?? 'Unknown';
          const count = report.findings?.length ?? 0;

          vscode.window.showInformationMessage(
            `🫧 Bubble Scan: ${count} issues — Score ${score}/100 (${grade})`,
            'Show Output',
            'View Problems',
          ).then((action) => {
            if (action === 'Show Output') outputChannel.show();
            if (action === 'View Problems') vscode.commands.executeCommand('workbench.actions.view.problems');
          });
        }

        // Open HTML report in browser
        if ((openHtml || autoOpenHtml)) {
          const htmlPath = join(resolvedOutputDir, 'audit-report.html');
          if (existsSync(htmlPath)) {
            vscode.env.openExternal(vscode.Uri.file(htmlPath));
          }
        }
      } catch (err: unknown) {
        const error = err as { stdout?: string; stderr?: string; message?: string };
        const output = error.stdout ?? error.stderr ?? error.message ?? 'Unknown error';
        outputChannel.appendLine('─── Scan Error ────────────────────────────────');
        outputChannel.appendLine(output);

        // Even if exit code 1 (fail-below threshold), we may have results
        const jsonReportPath = join(resolvedOutputDir, 'audit-report.json');
        if (existsSync(jsonReportPath)) {
          const report = JSON.parse(readFileSync(jsonReportPath, 'utf-8')) as ScanReport;
          populateDiagnostics(report, filePath, diagnostics);
          vscode.window.showWarningMessage(
            `🫧 Bubble Scan completed with issues. Check Problems panel.`,
            'Show Output',
          ).then((action) => { if (action === 'Show Output') outputChannel.show(); });
        } else {
          vscode.window.showErrorMessage(`🫧 Bubble Scan failed: ${error.message ?? output}`);
        }
      }
    },
  );
}

async function runClean(filePath: string): Promise<void> {
  const workspaceDir = dirname(filePath);
  const detectorBin = join(__dirname, '..', '..', 'node_modules', 'bubble-io-dead-code-detector', 'bin', 'bubble-detector.js');

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: '🫧 Bubble: Clean (dry-run)...', cancellable: false },
    async () => {
      try {
        const { stdout } = await execFileAsync(
          'node',
          [detectorBin, 'clean', '--file', filePath, '--dry-run', '--min-confidence', 'MEDIUM',
            '--only', 'dead-plugin,dead-option-set,dead-style'],
          { cwd: workspaceDir, timeout: 30000 },
        );
        outputChannel.appendLine('─── Clean Dry-Run ─────────────────────────────');
        outputChannel.appendLine(stdout);
        outputChannel.show();
        vscode.window.showInformationMessage('🫧 Bubble Clean: dry-run complete. Check Output panel for details.');
      } catch (err: unknown) {
        const error = err as { stdout?: string; message?: string };
        outputChannel.appendLine(error.stdout ?? error.message ?? 'Clean error');
        outputChannel.show();
      }
    },
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveFilePath(uri?: vscode.Uri): Promise<string | undefined> {
  if (uri) return uri.fsPath;

  // Active editor fallback
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.fileName.endsWith('.bubble')) {
    return editor.document.fileName;
  }

  // File picker
  const result = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { 'Bubble App Export': ['bubble'] },
    title: 'Select a .bubble file to analyze',
  });
  return result?.[0]?.fsPath;
}

function resolveDetectorBin(context: vscode.ExtensionContext): string {
  // Try local node_modules first (workspace install), then extension bundled bin
  const localBin = join(
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
    'node_modules',
    'bubble-io-dead-code-detector',
    'bin',
    'bubble-detector.js',
  );
  if (existsSync(localBin)) return localBin;

  return join(context.extensionPath, 'node_modules', 'bubble-io-dead-code-detector', 'bin', 'bubble-detector.js');
}

function populateDiagnostics(
  report: ScanReport,
  filePath: string,
  diagnostics: vscode.DiagnosticCollection,
): void {
  const uri = vscode.Uri.file(filePath);
  const diags: vscode.Diagnostic[] = (report.findings ?? []).map((f) => {
    const severity = f.severity === 'error'
      ? vscode.DiagnosticSeverity.Error
      : f.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

    const diag = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 0),
      `[${f.ruleId}] ${f.message}`,
      severity,
    );
    diag.source = 'bubble-dead-code';
    diag.code = f.ruleId;
    return diag;
  });
  diagnostics.set(uri, diags);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScanReport {
  healthScore?: { score: number; grade: string };
  findings?: Array<{ ruleId: string; message: string; severity: string }>;
}
