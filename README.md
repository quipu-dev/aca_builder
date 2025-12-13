# ACA Builder (ACA 构建器)

**ACA Builder** 是公理化组件架构 (Axiomatic Component Architecture) 的核心编译工具。它负责解析清单文件 (Manifest)，根据 D4 接口定义解析依赖关系，并最终将散落的组件 (Atoms) 序列化为完整的系统提示词 (System Prompt)。

## 1. 安装

ACA Builder 是一个标准的 Python 包。在开发环境中，建议以可编辑模式安装：

```bash
# 确保位于 system 目录下
cd system

# 安装依赖及开发工具 (pytest 等)
pip install -e .[dev]
```

安装完成后，`aca-build` 命令即可在终端中使用。

## 2. 核心指令

### 2.1 构建 (Build)

将清单文件编译为系统提示词。

```bash
aca-build build <MANIFEST_PATH> --library-path <LIBRARY_PATH>
```

- **参数**:
    - `MANIFEST_PATH`: 清单文件 (`.yaml`) 的路径。
    - `--library-path`: ACA 组件库的根目录 (默认为 `./aca_library`)。

**示例**:
```bash
aca-build build ../manifests/coder.yaml --library-path ../aca_library
```

### 2.2 校验 (Lint)

验证组件库的完整性和规范性。

```bash
aca-build lint <LIBRARY_PATH>
```

该命令会检查：
- 所有组件是否包含必要的元数据（如 `id`, `type`, `priority`）。
- D4 接口定义的命名规范。
- 依赖引用是否有效（是否存在死链）。
- 只能存在一个 Kernel 组件。

## 3. 清单文件特性

### 3.1 基础结构

```yaml
name: "Fhrsk Coder Agent"
version: "1.0"
imports:
  # 直接引用特定原子
  - query: { id: "d2-skill-python-coding" }
  # 通过 Lookup 引用 (推荐)
  - lookup: "d2l-entry-point"
```

### 3.2 依赖注入 (Overrides)

**v0.1.0 新增特性**

你可以在清单文件中“覆盖”D4 接口的默认指向。这允许你在不修改 D2 技能代码的情况下，动态改变其操作的数据对象或上下文。

```yaml
name: "Project Alpha Writer"
imports:
  - query: { id: "d2-skill-write-report" }

# 将 d2-skill-write-report 内部使用的通用上下文接口
# 重定向到特定的项目文件
overrides:
  d1l-context-files:
    selectors:
      - query: { id: "d1-project-alpha-specs" }
```

## 4. 开发与测试

运行单元测试套件：

```bash
# 在 system 目录下
pytest
```

## 目录结构

- `aca_builder/`: 源代码
    - `core.py`: 核心解析逻辑
    - `commands.py`: CLI 命令实现
- `tests/`: 测试用例
- `pyproject.toml`: 项目配置