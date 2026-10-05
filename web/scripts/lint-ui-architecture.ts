import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project();
const srcDir = path.resolve(__dirname, '../src');
project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

interface DiagnosticIssue {
  rule: string;
  file: string;
  line: number;
  message: string;
}

const issues: DiagnosticIssue[] = [];

console.log('🔍 正在运行 ACA Studio UI 架构守卫检查 (AST Linter)...');

for (const sf of project.getSourceFiles()) {
  const filePath = sf.getFilePath();
  const relPath = path.relative(srcDir, filePath);

  // 排除 UI 基元自身与类型定义文件
  if (relPath.startsWith('components/ui/') || relPath.endsWith('.d.ts')) {
    continue;
  }

  // 规则 1: 严禁在业务层直接书写原生带暗黑边框样式的裸 <input> 或 <select>
  sf.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxSelfClosingElement) {
      const el = node as any;
      const tagName = el.getTagNameNode().getText();
      if (tagName === 'input') {
        const typeAttr = el.getAttribute('type')?.getInitializer()?.getText() || '';
        if (typeAttr.includes('checkbox') || typeAttr.includes('radio')) return;

        const classVal = el.getAttribute('className')?.getInitializer()?.getText() || '';
        if (classVal.includes('bg-slate-950') && classVal.includes('border')) {
          issues.push({
            rule: 'UI-001: 强制使用 Input 基元',
            file: relPath,
            line: node.getStartLineNumber(),
            message: '检测到原生 <input> 堆叠表单样式，请改用 `@/components/ui/input` 的 `<Input />` 组件。',
          });
        }
      }
    } else if (node.getKind() === SyntaxKind.JsxElement) {
      const el = node as any;
      const tagName = el.getOpeningElement().getTagNameNode().getText();
      if (tagName === 'select') {
        const classVal = el.getOpeningElement().getAttribute('className')?.getInitializer()?.getText() || '';
        if (classVal.includes('bg-slate-950') && classVal.includes('border')) {
          issues.push({
            rule: 'UI-002: 强制使用 Select 基元',
            file: relPath,
            line: node.getStartLineNumber(),
            message: '检测到原生 <select> 堆叠表单样式，请改用 `@/components/ui/select` 的 `<Select />` 组件。',
          });
        }
      }
    }
  });

  // 规则 2: 严禁在业务层重新定义 Pillar 颜色映射字典
  sf.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.VariableDeclaration) {
      const varName = (node as any).getName();
      if (varName === 'typeVariantMap' || varName === 'pillarVariantMap') {
        issues.push({
          rule: 'UI-003: 强制收敛 Pillar 变体映射',
          file: relPath,
          line: node.getStartLineNumber(),
          message: `禁止定义私有变体字典 \`${varName}\`，请统一引用 \`@/components/ui/badge\` 导出的 \`getPillarVariant\`。`,
        });
      }
    }
  });

  // 规则 3: 严禁在根容器滥用 select-none 阻断复制
  if (relPath === 'App.tsx') {
    sf.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.StringLiteral) {
        const val = node.getLiteralValue();
        if (val.includes('h-screen') && val.includes('select-none')) {
          issues.push({
            rule: 'UI-004: 根布局选区防腐',
            file: relPath,
            line: node.getStartLineNumber(),
            message: 'App 根容器禁止声明全局 `select-none`，以保证控制台文本的可选取性。',
          });
        }
      }
    });
  }

  // 规则 4: 严禁在页面顶层容器声明全局 font-mono 污染全屏字体
  sf.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.StringLiteral) {
      const val = node.getLiteralValue();
      if (val.includes('h-full flex-col') && val.includes('font-mono')) {
        issues.push({
          rule: 'UI-005: 字体作用域防腐',
          file: relPath,
          line: node.getStartLineNumber(),
          message: '禁止在顶层容器声明全局 `font-mono`，等宽字体应精确作用于具体文本节点或代码编辑区。',
        });
      }
    }
  });
}

// 汇总报告
if (issues.length === 0) {
  console.log('✅ UI 架构守卫检查通过！未检测到任何表单基元违规或样式冗余反模式。\n');
  process.exit(0);
} else {
  console.error(`❌ UI 架构守卫检测到 ${issues.length} 处违规反模式：\n`);
  for (const issue of issues) {
    console.error(`  - [${issue.rule}] ${issue.file}:${issue.line}`);
    console.error(`    ${issue.message}`);
  }
  console.error('\n请按照设计系统规范进行调整后再提交。\n');
  process.exit(1);
}