import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, type SourceFile, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 ts-morph 项目，加载 web/src 下所有 TypeScript/TSX 源码
const project = new Project();
const srcDir = path.resolve(__dirname, '../src');
project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

let transformCount = 0;

function ensureNamedImport(sourceFile: SourceFile, moduleSpecifier: string, namedImport: string) {
  const existingImport = sourceFile.getImportDeclaration(
    (imp) => imp.getModuleSpecifierValue() === moduleSpecifier,
  );

  if (existingImport) {
    const isAlreadyImported = existingImport
      .getNamedImports()
      .some((named) => named.getName() === namedImport);
    if (!isAlreadyImported) {
      existingImport.addNamedImport(namedImport);
      transformCount++;
    }
  } else {
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [namedImport],
    });
    transformCount++;
  }
}

function removeClassTokens(rawClassName: string, tokensToRemove: string[]): string {
  const tokens = rawClassName.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((t) => !tokensToRemove.includes(t));
  return filtered.join(' ');
}

console.log('🚀 开始执行 Phase 1 AST 自动化重构...');

// ============================================================================
// 1. 收敛 Pillar 颜色映射 (CustomNodes, PromptViewer, AtomEditorTab)
// ============================================================================

// 1.1 CustomNodes.tsx
const customNodesFile = project.getSourceFile('CustomNodes.tsx');
if (customNodesFile) {
  // 移除本地 typeVariantMap 常量
  const typeVariantMapDecl = customNodesFile.getVariableStatement((stmt) =>
    stmt.getDeclarations().some((d) => d.getName() === 'typeVariantMap'),
  );
  if (typeVariantMapDecl) {
    typeVariantMapDecl.remove();
    transformCount++;
    console.log('  [CustomNodes.tsx] 移除本地 typeVariantMap 定义');
  }

  // 替换 variant 赋值: typeVariantMap[data.type] || 'default' -> getPillarVariant(data.type)
  customNodesFile.forEachDescendant((node) => {
    if (
      node.getKind() === SyntaxKind.BinaryExpression &&
      node.getText().includes('typeVariantMap[data.type]')
    ) {
      node.replaceWithText('getPillarVariant(data.type)');
      transformCount++;
      console.log('  [CustomNodes.tsx] 替换为 getPillarVariant(data.type)');
    }
  });

  // 1.3 静态文案修剪：去掉 "查找接口" 冗余字样，保留简洁的 "{pillar.toUpperCase()} 接口"
  customNodesFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxElement) {
      const text = node.getText();
      if (text.includes('{data.pillar?.toUpperCase()} 查找接口')) {
        node.replaceWithText(
          text.replace(
            '{data.pillar?.toUpperCase()} 查找接口',
            '{data.pillar?.toUpperCase()} 接口',
          ),
        );
        transformCount++;
        console.log('  [CustomNodes.tsx] 精简 LookupNode 冗余提示文案');
      }
    }
  });

  ensureNamedImport(customNodesFile, '@/components/ui/badge', 'getPillarVariant');
}

// 1.2 PromptViewer.tsx
const promptViewerFile = project.getSourceFile('PromptViewer.tsx');
if (promptViewerFile) {
  // 查找并移除 const getPillarBadgeVariant = ... 变量语句
  const getPillarVar = promptViewerFile.getVariableStatement((stmt) =>
    stmt.getDeclarations().some((d) => d.getName() === 'getPillarBadgeVariant'),
  );
  if (getPillarVar) {
    getPillarVar.remove();
    transformCount++;
    console.log('  [PromptViewer.tsx] 移除私有 getPillarBadgeVariant 函数声明');
  }

  // 替换调用: getPillarBadgeVariant(chunk.type) -> getPillarVariant(chunk.type, 'secondary')
  promptViewerFile.forEachDescendant((node) => {
    if (
      node.getKind() === SyntaxKind.CallExpression &&
      node.getText().startsWith('getPillarBadgeVariant(')
    ) {
      node.replaceWithText("getPillarVariant(chunk.type, 'secondary')");
      transformCount++;
      console.log('  [PromptViewer.tsx] 替换为 getPillarVariant(chunk.type, "secondary")');
    }
  });

  // 清理多余选区打补丁样式: select-text / selection:text-indigo-100
  promptViewerFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.StringLiteral) {
      const val = node.getLiteralValue();
      if (val.includes('select-text')) {
        const cleaned = removeClassTokens(val, [
          'select-text',
          'selection:bg-indigo-600/40',
          'selection:text-indigo-100',
        ]);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [PromptViewer.tsx] 清理局部对抗选区打补丁样式');
      }
    }
  });

  ensureNamedImport(promptViewerFile, '@/components/ui/badge', 'getPillarVariant');
}

// 1.3 AtomEditorTab.tsx
const atomEditorFile = project.getSourceFile('AtomEditorTab.tsx');
if (atomEditorFile) {
  atomEditorFile.forEachDescendant((node) => {
    if (
      node.getKind() === SyntaxKind.JsxAttribute &&
      (node as any).getNameNode().getText() === 'variant'
    ) {
      const init = (node as any).getInitializer();
      if (init?.getText().includes("atomType === 'd1'")) {
        init.replaceWithText("{getPillarVariant(atomType, 'kernel')}");
        transformCount++;
        console.log(
          '  [AtomEditorTab.tsx] 替换 4 级嵌套三元表达式为 getPillarVariant(atomType, "kernel")',
        );
      }
    }
  });

  ensureNamedImport(atomEditorFile, '@/components/ui/badge', 'getPillarVariant');
}

// ============================================================================
// 2. 全局选区标记清洗 (App.tsx, DiagnosticsDrawer.tsx)
// ============================================================================

// 2.1 App.tsx: 移除根容器上的 select-none，以及问题面板中的 select-text
const appFile = project.getSourceFile('App.tsx');
if (appFile) {
  appFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.StringLiteral) {
      const val = node.getLiteralValue();
      if (val.includes('h-screen') && val.includes('select-none')) {
        const cleaned = removeClassTokens(val, ['select-none']);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [App.tsx] 移除根容器全局 select-none 阻断限制');
      } else if (val.includes('select-text')) {
        const cleaned = removeClassTokens(val, ['select-text']);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [App.tsx] 移除问题面板无用 select-text 补丁');
      }
    }
  });
}

// 2.2 DiagnosticsDrawer.tsx: 移除 select-text 打补丁
const diagFile = project.getSourceFile('DiagnosticsDrawer.tsx');
if (diagFile) {
  diagFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.StringLiteral) {
      const val = node.getLiteralValue();
      if (val.includes('select-text')) {
        const cleaned = removeClassTokens(val, ['select-text']);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [DiagnosticsDrawer.tsx] 移除无用的 select-text 补丁');
      }
    }
  });
}

// ============================================================================
// 3. 静态文案与自包含标签修剪
// ============================================================================

// 3.1 ManifestEditorTab.tsx: 分组头移除同屏重复的 <span>{group.title}</span>
const manifestEditorFile = project.getSourceFile('ManifestEditorTab.tsx');
if (manifestEditorFile) {
  manifestEditorFile.forEachDescendant((node) => {
    if (
      node.getKind() === SyntaxKind.JsxElement &&
      node.getText() === '<span>{group.title}</span>'
    ) {
      node.replaceWithText('');
      transformCount++;
      console.log('  [ManifestEditorTab.tsx] 移除分组头与 Badge 重复的文本标签');
    }
  });
}

// 3.2 LookupEditorTab.tsx: 去除暴露文件名的文案后缀与多余 placeholder 说教
const lookupEditorFile = project.getSourceFile('LookupEditorTab.tsx');
if (lookupEditorFile) {
  lookupEditorFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxElement) {
      const text = node.getText();
      if (text === '<option value="public">公开导出 (package.yaml exports)</option>') {
        node.replaceWithText('<option value="public">公开导出</option>');
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 屏蔽选项中泄漏的 package.yaml 物理文件名');
      } else if (text === '<option value="private">内部私有 (d4/lookups.yaml)</option>') {
        node.replaceWithText('<option value="private">内部私有</option>');
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 屏蔽选项中泄漏的 d4/lookups.yaml 物理文件名');
      }
    } else if (node.getKind() === SyntaxKind.JsxAttribute) {
      const attr = node as any;
      if (attr.getNameNode?.().getText() === 'placeholder') {
        const init = attr.getInitializer();
        if (init && init.getText() === '"例如: core-safety 或点击 ULID"') {
          init.replaceWithText('"例如: core-safety"');
          transformCount++;
          console.log('  [LookupEditorTab.tsx] 精简 placeholder 冗余说教提示');
        }
      }
    }
  });
}

// 3.3 CreateFolderModal.tsx: 精简 Label 与 Placeholder 重叠
const createFolderModalFile = project.getSourceFile('CreateFolderModal.tsx');
if (createFolderModalFile) {
  createFolderModalFile.forEachDescendant((node) => {
    if (
      node.getKind() === SyntaxKind.JsxElement &&
      (node as any).getOpeningElement?.().getTagNameNode().getText() === 'label' &&
      node.getText().includes('目录名称 (可包含层级')
    ) {
      node.replaceWithText(
        '<label htmlFor="modal-folder-name" className="block text-slate-400 mb-1">\n            目录名称\n          </label>',
      );
      transformCount++;
      console.log('  [CreateFolderModal.tsx] 精简 Label 冗余括号示例');
    } else if (node.getKind() === SyntaxKind.JsxAttribute) {
      const attr = node as any;
      if (attr.getNameNode?.().getText() === 'placeholder') {
        const init = attr.getInitializer();
        if (init && init.getText() === '"例如: core_agents 或 department_a"') {
          init.replaceWithText('"例如: projects/alpha"');
          transformCount++;
          console.log('  [CreateFolderModal.tsx] 精简 Placeholder 示例');
        }
      }
    }
  });
}

console.log(`\n💾 正在保存所有变更文件 (共计完成 ${transformCount} 处 AST 转换)...`);
project.saveSync();
console.log('✨ Phase 1 自动化 AST 重构完成！');
