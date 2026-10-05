import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Node, Project, type SourceFile, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project();
const srcDir = path.resolve(__dirname, '../src');
project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

let transformCount = 0;

function ensureNamedImport(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport: string,
): void {
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

// 安全提取 OpeningElement 上的 className 属性值
function getOpeningElementClassName(openingElement: Node): string | null {
  if (!Node.isJsxOpeningElement(openingElement)) return null;
  const classAttr = openingElement.getAttribute('className');
  if (!classAttr || !Node.isJsxAttribute(classAttr)) return null;
  const init = classAttr.getInitializer();
  if (init && Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }
  return null;
}

console.log('🚀 开始执行安全加固的 Phase 3 AST 样式与组件重构...');

// ============================================================================
// 1. 全站 SegmentedControl 自动化替换 (严格限定 OpeningElement 自身属性，绝不冒泡匹配外层容器)
// ============================================================================

// 1.1 App.tsx: 资源管理器清单/组件包切换
const appFile = project.getSourceFile('App.tsx');
if (appFile) {
  appFile.forEachDescendant((node) => {
    if (Node.isJsxElement(node)) {
      const opening = node.getOpeningElement();
      const currentClass = getOpeningElementClassName(opening);
      // 必须精确匹配当前胶囊容器自身的 className
      if (
        currentClass &&
        currentClass.includes('flex rounded bg-slate-900') &&
        currentClass.includes('border-slate-800') &&
        node.getText().includes("setExplorerTab('manifests')")
      ) {
        node.replaceWithText(`
                    <SegmentedControl
                      value={explorerTab}
                      onChange={setExplorerTab}
                      options={[
                        { value: 'manifests', label: '清单蓝图', icon: <Layers className="h-3.5 w-3.5" /> },
                        { value: 'packages', label: '组件包', icon: <Package className="h-3.5 w-3.5" /> },
                      ]}
                    />
        `.trim());
        transformCount++;
        console.log('  [App.tsx] 成功安全替换资源管理器 SegmentedControl');
      }
    }
  });
  ensureNamedImport(appFile, '@/components/ui/segmented-control', 'SegmentedControl');
}

// 1.2 PromptViewer.tsx: 分块/文本模式切换
const promptViewerFile = project.getSourceFile('PromptViewer.tsx');
if (promptViewerFile) {
  promptViewerFile.forEachDescendant((node) => {
    if (Node.isJsxElement(node)) {
      const opening = node.getOpeningElement();
      const currentClass = getOpeningElementClassName(opening);
      if (
        currentClass &&
        currentClass.includes('flex items-center rounded bg-slate-950') &&
        currentClass.includes('border-slate-800/80') &&
        node.getText().includes("setDisplayMode('chunks')")
      ) {
        node.replaceWithText(`
          <SegmentedControl
            size="sm"
            value={displayMode}
            onChange={setDisplayMode}
            options={[
              { value: 'chunks', label: '分块', icon: <Layers className="h-3 w-3" />, title: '分块卡片流呈现' },
              { value: 'raw', label: '文本', icon: <Code2 className="h-3 w-3" />, title: '完整纯文本视口' },
            ]}
          />
        `.trim());
        transformCount++;
        console.log('  [PromptViewer.tsx] 成功安全替换分块/文本 SegmentedControl');
      }
    }
  });
  ensureNamedImport(promptViewerFile, '@/components/ui/segmented-control', 'SegmentedControl');
}

// 1.3 ManifestEditorTab.tsx: 右侧伴生栏白板拓扑/实时编译切换
const manifestEditorFile = project.getSourceFile('ManifestEditorTab.tsx');
if (manifestEditorFile) {
  manifestEditorFile.forEachDescendant((node) => {
    if (Node.isJsxElement(node)) {
      const opening = node.getOpeningElement();
      const currentClass = getOpeningElementClassName(opening);
      if (
        currentClass &&
        currentClass.includes('flex rounded bg-slate-950 border border-slate-800') &&
        node.getText().includes("setRightView('graph')")
      ) {
        node.replaceWithText(`
                  <SegmentedControl
                    size="sm"
                    value={rightView}
                    onChange={setRightView}
                    options={[
                      { value: 'graph', label: '白板拓扑', icon: <Network className="h-3 w-3" />, title: '在右侧观察依赖拓扑 DAG 变化' },
                      { value: 'prompt', label: '实时编译', icon: <Code2 className="h-3 w-3" />, title: '在右侧查看拼接好的完整 Prompt 文本与词元' },
                    ]}
                  />
        `.trim());
        transformCount++;
        console.log('  [ManifestEditorTab.tsx] 成功安全替换伴生栏 SegmentedControl');
      }
    }
  });
  ensureNamedImport(manifestEditorFile, '@/components/ui/segmented-control', 'SegmentedControl');
}

// 1.4 LookupEditorTab.tsx: 伴生面板三段切换 & 选择器模式三段切换
const lookupEditorFile = project.getSourceFile('LookupEditorTab.tsx');
if (lookupEditorFile) {
  lookupEditorFile.forEachDescendant((node) => {
    if (Node.isJsxElement(node)) {
      const opening = node.getOpeningElement();
      const currentClass = getOpeningElementClassName(opening);

      // 右侧视图切换 (atoms / graph / prompt)
      if (
        currentClass &&
        currentClass.includes('flex items-center gap-1 bg-slate-950 border border-slate-800') &&
        node.getText().includes("setRightView('atoms')")
      ) {
        node.replaceWithText(`
                <SegmentedControl
                  size="sm"
                  value={rightView}
                  onChange={setRightView}
                  options={[
                    { value: 'atoms', label: '命中原子', icon: <Layers className="h-3 w-3" />, title: '查看一阶命中原子' },
                    { value: 'graph', label: '白板拓扑', icon: <Network className="h-3 w-3" />, title: '查看以此 Lookup 为根的级联依赖拓扑图' },
                    { value: 'prompt', label: '切片编译', icon: <Code2 className="h-3 w-3" />, title: '查看此接口传递依赖排序生成的切片 Prompt 文本' },
                  ]}
                />
        `.trim());
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 成功安全替换右侧面板 SegmentedControl');
      }
      // 选择器构建器模式切换 (id / domain / ref)
      else if (
        currentClass &&
        currentClass.includes('flex rounded bg-slate-950 p-0.5 border border-slate-800') &&
        node.getText().includes("setSelectorMode('id')")
      ) {
        node.replaceWithText(`
                  <SegmentedControl
                    size="sm"
                    value={selectorMode}
                    onChange={setSelectorMode}
                    options={[
                      { value: 'id', label: '按原子 ID 选取' },
                      { value: 'domain', label: '按 Domain 领域查询' },
                      { value: 'ref', label: '跨 Lookup 引用' },
                    ]}
                  />
        `.trim());
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 成功安全替换选择器模式 SegmentedControl');
      }
    }
  });
  ensureNamedImport(lookupEditorFile, '@/components/ui/segmented-control', 'SegmentedControl');
}

// ============================================================================
// 2. 字体作用域治理 (剥离 LookupEditorTab 根部 font-mono，清理防御性 font-sans)
// ============================================================================

if (lookupEditorFile) {
  lookupEditorFile.forEachDescendant((node) => {
    if (Node.isStringLiteral(node)) {
      const val = node.getLiteralValue();
      if (val.includes('flex h-full flex-col') && val.includes('font-mono')) {
        const cleaned = removeClassTokens(val, ['font-mono', 'select-none']);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 剥离根容器全局 font-mono');
      } else if (val.includes('font-sans') && !val.includes('font-sans leading-relaxed')) {
        const cleaned = removeClassTokens(val, ['font-sans']);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 清理防御性 font-sans');
      }
    }
  });
}

// AtomEditorTab.tsx: 清理内部防御性 font-sans
const atomEditorFile = project.getSourceFile('AtomEditorTab.tsx');
if (atomEditorFile) {
  atomEditorFile.forEachDescendant((node) => {
    if (Node.isStringLiteral(node)) {
      const val = node.getLiteralValue();
      if (val.includes('font-sans') && !val.includes('font-sans select-none')) {
        const cleaned = removeClassTokens(val, ['font-sans']);
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [AtomEditorTab.tsx] 清理防御性 font-sans');
      }
    }
  });
}

// ============================================================================
// 3. 嵌套背景扁平化
// ============================================================================

if (lookupEditorFile) {
  lookupEditorFile.forEachDescendant((node) => {
    if (Node.isStringLiteral(node)) {
      const val = node.getLiteralValue();
      if (val.includes('line-clamp-2') && val.includes('bg-slate-900/60')) {
        const cleaned = val
          .replace('bg-slate-900/60 p-1.5 rounded', 'pt-1 border-t border-slate-800/40')
          .trim();
        node.setLiteralValue(cleaned);
        transformCount++;
        console.log('  [LookupEditorTab.tsx] 扁平化原子卡片内嵌预览背景');
      }
    }
  });
}

console.log(`\n💾 正在保存 Phase 3 治理产物 (共计精确完成 ${transformCount} 处转换)...`);
project.saveSync();
console.log('✨ Phase 3 样式层级扁平化与 SegmentedControl 安全迁移完成！');