# ACA Builder (ACA 构建器)

**ACA Builder** 是公理化组件架构 (Axiomatic Component Architecture) 的核心编译工具。它负责解析清单文件 (Manifest)，根据 D4 接口定义解析依赖关系，并最终将散落的组件 (Atoms) 序列化为完整的系统提示词 (System Prompt)。

## 1. 安装

ACA Builder 是一个标准的 Python 包。在开发环境中，建议以可编辑模式安装：

```bash
# 确保位于 aca_builder 目录下
cd path/to/aca_builder

# 安装依赖及开发工具 (pytest 等)
pip install -e .[dev]
```

安装完成后，`aca-build` 命令即可在终端中使用。

## 2. 全局配置

为了启用多库支持、简化命令调用和设置后处理钩子，`aca-build` 依赖一个全局配置文件：`~/.config/aca/config.yaml`。

**示例 `config.yaml` 文件**:
```yaml
# ~/.config/aca/config.yaml
library_paths:
  - ~/my_aca_libraries/common    # 你的通用 ACA 组件库
  - /path/to/project_a/aca_libs # 项目 A 的特定组件库
  - ./aca_library               # 相对路径，相对于 config.yaml 所在目录

manifest_paths:
  - ~/my_aca_manifests          # 你的通用 manifests 目录
  - /path/to/project_a/manifests # 项目 A 的 manifests
  - ./manifests                 # 相对路径，相对于 config.yaml 所在目录

# 可选的后处理钩子命令。构建完成后，生成的提示词将通过 stdin 导入此命令。
# 命令会在执行 aca-build 的当前工作目录运行。
post_process_hook: "pbcopy"     # 构建后自动复制到剪贴板 (macOS)
# post_process_hook: "xsel -ib" # 构建后自动复制到剪贴板 (Linux X11)
# post_process_hook: "/usr/local/bin/my_custom_script.sh" # 执行自定义脚本
```

-   **`library_paths`**: 包含 ACA 组件（Atoms）的目录列表。`aca-build` 会从所有这些目录中加载组件。支持绝对路径、用户主目录 (`~`) 和相对于 `config.yaml` (`~/.config/aca/`) 的相对路径。
-   **`manifest_paths`**: 包含 ACA 清单文件（Manifests）的目录列表。`aca-build list` 和 `aca-build build <name>` 会在此处查找 Manifest。支持绝对路径、用户主目录 (`~`) 和相对于 `config.yaml` (`~/.config/aca/`) 的相对路径。
-   **`post_process_hook`**: 一个可选的 shell 命令。在 `aca-build build` 成功生成提示词后，会将提示词内容通过 `stdin` 引导至此命令执行。该命令会在当前用户执行 `aca-build` 的工作目录下运行。

## 3. 核心指令

### 3.1 构建 (Build)

将清单文件编译为系统提示词。现在支持通过简化名称或直接文件路径进行构建。

```bash
# 通过配置中定义的 manifest 名称进行构建 (推荐)
aca-build build <PACKAGE_NAME>/<MANIFEST_FILE_STEM>

# 示例: 编译在 manifest_paths 中找到的 coder/agent.yaml 为提示词
aca-build build coder/agent

# 通过文件路径进行构建 (兼容旧行为)
aca-build build <MANIFEST_PATH> --file

# 示例: 编译当前目录下 manifests/my_agent.yaml 为提示词
aca-build build ./manifests/my_agent.yaml --file
```

-   **参数**:
    -   `<PACKAGE_NAME>/<MANIFEST_FILE_STEM>`: 清单文件在 `manifest_paths` 中定义的逻辑名称。例如，如果 `manifest_paths` 包含 `/path/to/my_projects/my_package`，且该目录下有 `agent.yaml`，则使用 `my_package/agent`。
    -   `<MANIFEST_PATH>`: 清单文件 (`.yaml`) 的具体文件路径。
    -   `--file`, `-f`: 强制将第一个参数视为文件路径，而不是逻辑名称。

### 3.2 列出 Manifest (List)

列出所有在 `config.yaml` 的 `manifest_paths` 中定义的可用清单文件，以便快速概览和调用。

```bash
aca-build list
```

**示例输出**:
```
my_package/agent
another_package/system_watcher
```

### 3.3 校验 (Lint)

验证 `config.yaml` 中所有 `library_paths` 内组件库的完整性和规范性。

```bash
aca-build lint
```

该命令会检查：
-   所有组件是否包含必要的元数据（如 `id`, `type`, `priority`）。
-   D4 接口定义的命名规范。
-   依赖引用是否有效（是否存在死链）。
-   只能存在一个 Kernel 组件。
-   禁止相同 `atom_id` 在多个库中重复。

## 4. 清单文件特性

### 4.1 基础结构

```yaml
name: "Coder Agent"
version: "1.0"
imports:
  # 直接引用特定原子
  - query: { id: "d2-skill-python-coding" }
  # 通过 Lookup 引用 (推荐)
  - lookup: "d2l-entry-point"
```

### 4.2 依赖注入 (Overrides)

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

## 5. 开发与测试

运行单元测试套件：

```bash
# 确保位于 aca_builder 目录下
pytest
```

## 目录结构

-   `aca_builder/`: 源代码
    -   `config.py`: 全局配置加载与管理
    -   `core.py`: 核心解析逻辑
    -   `commands.py`: CLI 命令实现
    -   `main.py`: 主程序入口
    -   `exceptions.py`: 自定义异常
-   `tests/`: 测试用例
-   `pyproject.toml`: 项目配置
-   `README.md`: 本文档
