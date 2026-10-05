import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, type SourceFile, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project();
const srcDir = path.resolve(__dirname, '../src');
project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

let inputReplacedCount = 0;
let selectReplacedCount = 0;

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
    }
  } else {
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [namedImport],
    });
  }
}

// 清洗已被基元组件内置的通用样板类
function cleanFormClassTokens(rawClass: string): string {
  const builtInTokens = [
    'w-full',
    'bg-slate-950',
    'border',
    'border-slate-800',
    'text-slate-200',
    'focus:outline-none',
    'focus:border-indigo-500',
    'font-mono',
    'text-xs',
    'text-sm',
    'rounded',
    'rounded-lg',
    'px-2.5',
    'py-1',
    'px-2',
    'px-3',
    'py-2',
    'p-2.5',
    'p-3',
  ];
  const tokens = rawClass.split(/\s+/).filter(Boolean);
  const remaining = tokens.filter((t) => !builtInTokens.includes(t));
  return remaining.join(' ');
}

// 目标目录白名单：Tab 编辑器、Modals 对话框
const targetFiles = project.getSourceFiles().filter((sf) => {
  const relPath = path.relative(srcDir, sf.getFilePath());
  // 排除 UI 基元自身定义文件
  if (relPath.startsWith('components/ui/')) return false;
  return (
    relPath.includes('features/authoring/') ||
    relPath.includes('features/composer/') ||
    relPath.includes('features/settings/') ||
    relPath.includes('components/modals/')
  );
});

console.log(`🚀 开始执行 Phase 2 AST 表单基元替换 (共计扫描 ${targetFiles.length} 个业务模块)...`);

for (const sf of targetFiles) {
  const fileName = sf.getBaseName();
  let fileUsedInput = false;
  let fileUsedSelect = false;

  // 1. 替换 <input ... /> 为 <Input ... />
  sf.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxSelfClosingElement) {
      const el = node as any;
      const tagNameNode = el.getTagNameNode();
      if (tagNameNode.getText() === 'input') {
        const typeAttr = el.getAttribute('type');
        const typeVal = typeAttr?.getInitializer()?.getText() || '';
        // 排除单选与复选框
        if (typeVal.includes('radio') || typeVal.includes('checkbox')) return;

        const classAttr = el.getAttribute('className');
        const classVal = classAttr?.getInitializer()?.getText() || '';

        // 仅替换具备深色样板特征的原生输入框
        if (classVal.includes('bg-slate-950') && classVal.includes('border')) {
          tagNameNode.replaceWithText('Input');
          fileUsedInput = true;
          inputReplacedCount++;

          const rawClassString = classVal.replace(/^["']|["']$/g, '');
          const cleaned = cleanFormClassTokens(rawClassString);

          if (cleaned.length === 0) {
            classAttr.replaceWithText('');
          } else {
            classAttr.replaceWithText(`className="${cleaned}"`);
          }
        }
      }
    }
  });

  // 2. 替换 <select ...>...</select> 为 <Select ...>...</Select>
  sf.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxElement) {
      const el = node as any;
      const opening = el.getOpeningElement();
      const closing = el.getClosingElement();
      const openTag = opening.getTagNameNode();
      const closeTag = closing.getTagNameNode();

      if (openTag.getText() === 'select') {
        const classAttr = opening.getAttribute('className');
        const classVal = classAttr?.getInitializer()?.getText() || '';

        if (classVal.includes('bg-slate-950') && classVal.includes('border')) {
          openTag.replaceWithText('Select');
          closeTag.replaceWithText('Select');
          fileUsedSelect = true;
          selectReplacedCount++;

          const rawClassString = classVal.replace(/^["']|["']$/g, '');
          const cleaned = cleanFormClassTokens(rawClassString);

          if (cleaned.length === 0) {
            classAttr.replaceWithText('');
          } else {
            classAttr.replaceWithText(`className="${cleaned}"`);
          }
        }
      }
    }
  });

  if (fileUsedInput) {
    ensureNamedImport(sf, '@/components/ui/input', 'Input');
    console.log(`  [${fileName}] 成功迁移 Input 组件`);
  }
  if (fileUsedSelect) {
    ensureNamedImport(sf, '@/components/ui/select', 'Select');
    console.log(`  [${fileName}] 成功迁移 Select 组件`);
  }
}

console.log('\n💾 正在保存 Phase 2 AST 重构产物...');
console.log(`  - 累计升级 Input 组件: ${inputReplacedCount} 处`);
console.log(`  - 累计升级 Select 组件: ${selectReplacedCount} 处`);
project.saveSync();
console.log('✨ Phase 2 自动化表单基元重构完成！');
