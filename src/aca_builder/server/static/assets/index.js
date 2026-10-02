import { R as React, j as jsxRuntimeExports, C as Check, a as Copy, b as ReactCodeMirror, r as reactExports, F as FileCode, L as LoaderCircle, S as Save, X, c as Sparkles, d as create, P as Plus, B as Box, A as ArrowUp, e as ArrowDown, T as Trash2, f as RefreshCw, O as OctagonAlert, g as TriangleAlert, h as CircleCheckBig, i as ChevronDown, k as ChevronRight, l as Package, G as Globe, m as Lock, H as Handle, n as Layers, u as useNodesState, o as useEdgesState, p as index, q as Background, s as BackgroundVariant, t as Controls, v as Cpu, w as CircleAlert, x as ShieldCheck, y as FilePlus2, z as SlidersVertical, N as Network, E as Eye, D as ReactDOM } from "./vendor-react.js";
import { H as twMerge, J as clsx } from "./vendor-others.js";
import { m as markdown } from "./vendor-codemirror.js";
import { P as Position } from "./vendor-xyflow.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      default: "bg-indigo-600 text-white shadow hover:bg-indigo-500",
      secondary: "bg-slate-800 text-slate-200 shadow-sm hover:bg-slate-700",
      outline: "border border-slate-800 bg-transparent shadow-sm hover:bg-slate-800 text-slate-200",
      ghost: "hover:bg-slate-800 text-slate-300 hover:text-white",
      destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-500"
    };
    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9"
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        ref,
        className: cn(baseStyles, variants[variant], sizes[size], className),
        ...props
      }
    );
  }
);
Button.displayName = "Button";
function PromptViewer({ value }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const lineCount = value ? value.split("\n").length : 0;
  const charCount = value ? value.length : 0;
  const estimatedTokens = Math.round(charCount / 3.8);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-slate-900/60 text-xs font-mono text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "总行数: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-slate-200", children: lineCount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "总字符数: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-slate-200", children: charCount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "估算词元: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-indigo-400", children: [
            "~",
            estimatedTokens
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: handleCopy,
          disabled: !value,
          className: "h-7 text-xs flex items-center gap-1.5",
          children: [
            copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3.5 w-3.5 text-emerald-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }),
            copied ? "已复制" : "复制输出"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ReactCodeMirror,
      {
        value,
        height: "100%",
        extensions: [markdown()],
        editable: false,
        theme: "dark",
        basicSetup: {
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false
        },
        className: "text-xs font-mono"
      }
    ) })
  ] });
}
function AtomEditorDrawer({
  atomId,
  isOpen,
  onClose,
  onSaved
}) {
  const [content, setContent] = reactExports.useState("");
  const [sourceFile, setSourceFile] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [statusMsg, setStatusMsg] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (!isOpen || !atomId) return;
    setLoading(true);
    setStatusMsg("");
    fetch(`/api/atoms/${encodeURIComponent(atomId)}`).then((res) => {
      if (!res.ok) throw new Error("读取原子失败");
      return res.json();
    }).then((data) => {
      setContent(data.raw || "");
      setSourceFile(data.source_file || "");
    }).catch((err) => {
      setStatusMsg(err.message || "加载异常");
    }).finally(() => setLoading(false));
  }, [atomId, isOpen]);
  const handleSave = async () => {
    if (!atomId) return;
    setSaving(true);
    setStatusMsg("正在保存...");
    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_content: content })
      });
      if (res.ok) {
        setStatusMsg("保存成功");
        onSaved();
        setTimeout(() => setStatusMsg(""), 2500);
      } else {
        const data = await res.json();
        setStatusMsg(`保存失败: ${data.detail}`);
      }
    } catch (_err) {
      setStatusMsg("保存请求异常");
    } finally {
      setSaving(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-y-0 right-0 z-50 w-[600px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "h-4 w-4 text-indigo-400 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col truncate", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold truncate", children: atomId }),
          sourceFile && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-mono truncate", title: sourceFile, children: sourceFile })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        statusMsg && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-indigo-400 font-mono", children: statusMsg }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: handleSave,
            disabled: saving || loading,
            className: "flex items-center gap-1.5 h-8 text-xs",
            children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
              "保存"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-white p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden p-2 bg-slate-950", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex items-center justify-center text-xs text-slate-500 font-mono gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin text-indigo-400" }),
      "正在加载原子内容..."
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      ReactCodeMirror,
      {
        value: content,
        height: "100%",
        extensions: [markdown()],
        theme: "dark",
        onChange: (val) => setContent(val),
        basicSetup: {
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true
        },
        className: "text-xs font-mono h-full"
      }
    ) })
  ] });
}
function CreateAtomModal({
  isOpen,
  onClose,
  packages,
  onCreated
}) {
  var _a;
  const [selectedPkg, setSelectedPkg] = reactExports.useState(((_a = packages[0]) == null ? void 0 : _a.name) || "");
  const [pillarType, setPillarType] = reactExports.useState("d3");
  const [rawName, setRawName] = reactExports.useState("");
  const [priority, setPriority] = reactExports.useState(1);
  const [domainStr, setDomainStr] = reactExports.useState("");
  const [usesStr, setUsesStr] = reactExports.useState("");
  const [content, setContent] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [errorMsg, setErrorMsg] = reactExports.useState("");
  if (!isOpen) return null;
  const cleanName = rawName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const autoId = cleanName ? `${pillarType}-${cleanName}` : `${pillarType}-...`;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPkg || !cleanName || !content.trim()) {
      setErrorMsg("请填写完整的必要信息（包、名称与正文）");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    const domainList = domainStr.split(",").map((s) => s.trim()).filter(Boolean);
    const usesList = usesStr.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/atoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: selectedPkg,
          id: `${pillarType}-${cleanName}`,
          type: pillarType,
          priority: pillarType === "d3" ? priority : void 0,
          domain: domainList,
          uses: pillarType === "d2" ? usesList : [],
          content
        })
      });
      const data = await res.json();
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        setErrorMsg(data.detail || "保存原子失败");
      }
    } catch (_err) {
      setErrorMsg("网络请求异常");
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-slate-950/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-indigo-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold text-slate-100", children: "新建原子组件向导" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "text-slate-400 hover:text-slate-100 transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "form",
      {
        onSubmit: handleSubmit,
        className: "flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono",
        children: [
          errorMsg && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded bg-rose-950/60 border border-rose-800/80 p-2.5 text-rose-300", children: errorMsg }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "create-atom-pkg", className: "text-slate-400 block mb-1", children: "所属组件包" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  id: "create-atom-pkg",
                  value: selectedPkg,
                  onChange: (e) => setSelectedPkg(e.target.value),
                  className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500",
                  children: packages.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.name, children: p.name }, p.name))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "create-atom-pillar", className: "text-slate-400 block mb-1", children: "构造类别" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  id: "create-atom-pillar",
                  value: pillarType,
                  onChange: (e) => setPillarType(e.target.value),
                  className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d3", children: "D3 控制基质（公理与原则）" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d2", children: "D2 程序基质（流程与技能）" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d1", children: "D1 陈述基质（数据与事实）" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "create-atom-raw-name", className: "text-slate-400 block mb-1", children: "标识后缀名称" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "create-atom-raw-name",
                  type: "text",
                  value: rawName,
                  onChange: (e) => setRawName(e.target.value),
                  placeholder: "例如: core-operations",
                  className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "create-atom-auto-id", className: "text-slate-400 block mb-1", children: "自动生成唯一标识" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "create-atom-auto-id",
                  type: "text",
                  readOnly: true,
                  value: autoId,
                  className: "w-full bg-slate-950/60 border border-slate-800/80 rounded px-2.5 py-1.5 text-indigo-300 select-all"
                }
              )
            ] })
          ] }),
          pillarType === "d3" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded border border-purple-900/40 bg-purple-950/20 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-purple-300 font-semibold block mb-2", children: "绝对优先级设定" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-4", children: [
              { val: 0, label: "0 级（最高公理）" },
              { val: 1, label: "1 级（核心原则）" },
              { val: 2, label: "2 级（情境指令）" }
            ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "label",
              {
                className: "flex items-center gap-1.5 cursor-pointer text-slate-300",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "radio",
                      name: "priority",
                      checked: priority === item.val,
                      onChange: () => setPriority(item.val),
                      className: "text-indigo-600 focus:ring-0"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label })
                ]
              },
              item.val
            )) })
          ] }),
          pillarType === "d2" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded border border-emerald-900/40 bg-emerald-950/20 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "label",
              {
                htmlFor: "create-atom-uses",
                className: "text-emerald-300 font-semibold block mb-1",
                children: "依赖查找接口列表"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "create-atom-uses",
                type: "text",
                value: usesStr,
                onChange: (e) => setUsesStr(e.target.value),
                placeholder: "用逗号分隔，例如: fhrsk::d3l-core-protocol, quipu::d2l-file-skill",
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "create-atom-domain", className: "text-slate-400 block mb-1", children: "领域标签（逗号分隔）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "create-atom-domain",
                type: "text",
                value: domainStr,
                onChange: (e) => setDomainStr(e.target.value),
                placeholder: "例如: fhrsk, reasoning, language",
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "create-atom-content", className: "text-slate-400 block mb-1", children: "原子正文内容" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                id: "create-atom-content",
                rows: 6,
                value: content,
                onChange: (e) => setContent(e.target.value),
                placeholder: "在这里编写组件的具体规则、流程或数据...",
                className: "w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs resize-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-slate-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: onClose, children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", size: "sm", disabled: submitting, children: submitting ? "正在写入..." : "保存原子到磁盘" })
          ] })
        ]
      }
    )
  ] }) });
}
function Badge({ className, variant = "default", ...props }) {
  const variantStyles = {
    default: "bg-indigo-600/30 text-indigo-300 border-indigo-500/40",
    secondary: "bg-slate-800 text-slate-300 border-slate-700",
    outline: "border-slate-700 text-slate-400",
    destructive: "bg-rose-950/60 text-rose-300 border-rose-800/60",
    d1: "bg-cyan-950/60 text-cyan-300 border-cyan-800/60",
    d2: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
    d3: "bg-purple-950/60 text-purple-300 border-purple-800/60",
    kernel: "bg-amber-950/60 text-amber-300 border-amber-800/60"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variantStyles[variant],
        className
      ),
      ...props
    }
  );
}
const useComposerStore = create((set) => ({
  manifestName: "custom_agent",
  version: "1.0.0",
  description: "Composed via ACA Studio",
  items: [],
  setManifestName: (name) => set({ manifestName: name }),
  setVersion: (version) => set({ version }),
  setDescription: (description) => set({ description }),
  addItem: (item) => set((state) => {
    if (state.items.some((i) => i.lookup === item.lookup)) {
      return state;
    }
    const newItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    return { items: [...state.items, newItem] };
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter((i) => i.id !== id)
  })),
  moveItem: (index2, direction) => set((state) => {
    const targetIndex = direction === "up" ? index2 - 1 : index2 + 1;
    if (targetIndex < 0 || targetIndex >= state.items.length) {
      return state;
    }
    const newItems = [...state.items];
    const temp = newItems[index2];
    newItems[index2] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    return { items: newItems };
  }),
  clearItems: () => set({ items: [] }),
  loadFromManifest: (name, imports) => set({
    manifestName: name,
    items: (imports || []).filter((imp) => !!imp.lookup).map((imp) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lookup: imp.lookup
    }))
  }),
  loadManifestData: (manifest) => set({
    manifestName: manifest.name,
    version: manifest.version || "1.0.0",
    description: manifest.description || "",
    items: (manifest.imports || []).filter((imp) => !!imp.lookup).map((imp) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lookup: imp.lookup
    }))
  }),
  resetNewManifest: () => set({
    manifestName: "new_agent",
    version: "1.0.0",
    description: "",
    items: []
  })
}));
function VisualComposer({
  packages
}) {
  const store = useComposerStore();
  const [selectedLookup, setSelectedLookup] = reactExports.useState("");
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [saveStatus, setSaveStatus] = reactExports.useState("");
  const availableExports = [];
  for (const pkg of packages) {
    for (const [key, def] of Object.entries(pkg.exports || {})) {
      const exportDef = def;
      availableExports.push({
        key,
        pkg: pkg.name,
        pillar: exportDef.pillar || "d1",
        desc: exportDef.description || ""
      });
    }
  }
  const handleAdd = () => {
    if (!selectedLookup) return;
    const found = availableExports.find((e) => e.key === selectedLookup);
    store.addItem({
      lookup: selectedLookup,
      pillar: found == null ? void 0 : found.pillar,
      description: found == null ? void 0 : found.desc
    });
    setSelectedLookup("");
  };
  const handleSaveManifest = async () => {
    if (!store.manifestName || store.items.length === 0) return;
    setIsSaving(true);
    setSaveStatus("正在保存...");
    try {
      const res = await fetch("/api/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.manifestName,
          version: store.version,
          description: store.description,
          imports: store.items.map((i) => ({ lookup: i.lookup }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("已保存");
        setTimeout(() => setSaveStatus(""), 3e3);
      } else {
        setSaveStatus(`保存失败: ${data.detail}`);
      }
    } catch (_e) {
      setSaveStatus("保存出错");
    } finally {
      setIsSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col space-y-4 p-4 overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-indigo-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold text-slate-200", children: "清单蓝图设置" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          saveStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-indigo-400 font-mono", children: saveStatus }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              onClick: handleSaveManifest,
              disabled: isSaving || store.items.length === 0,
              className: "flex items-center gap-1.5",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
                " 保存清单"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "composer-manifest-name",
              className: "text-[11px] font-mono text-slate-400 block mb-1",
              children: "清单名称"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "composer-manifest-name",
              type: "text",
              value: store.manifestName,
              onChange: (e) => store.setManifestName(e.target.value),
              className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "composer-manifest-version",
              className: "text-[11px] font-mono text-slate-400 block mb-1",
              children: "版本"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "composer-manifest-version",
              type: "text",
              value: store.version,
              onChange: (e) => store.setVersion(e.target.value),
              className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "composer-manifest-desc",
              className: "text-[11px] font-mono text-slate-400 block mb-1",
              children: "描述说明"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "composer-manifest-desc",
              type: "text",
              value: store.description,
              onChange: (e) => store.setDescription(e.target.value),
              className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lookup-select", className: "text-xs font-semibold text-slate-300 block", children: "从公开接口添加组件" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            id: "lookup-select",
            value: selectedLookup,
            onChange: (e) => setSelectedLookup(e.target.value),
            className: "flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "-- 请选择要注入的公开查找接口 --" }),
              availableExports.map((exp) => {
                var _a;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: exp.key, children: [
                  "[",
                  exp.pkg,
                  "] ",
                  exp.key,
                  " (",
                  (_a = exp.pillar) == null ? void 0 : _a.toUpperCase(),
                  ")"
                ] }, exp.key);
              })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: handleAdd,
            disabled: !selectedLookup,
            className: "flex items-center gap-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
              " 添加"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 rounded-lg border border-slate-800 bg-slate-900/20 p-4 flex flex-col space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs font-mono text-slate-400 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "当前已注入组件 (",
          store.items.length,
          ")"
        ] }),
        store.items.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: store.clearItems,
            className: "text-slate-500 hover:text-rose-400 transition-colors",
            children: "清空全部"
          }
        )
      ] }),
      store.items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-xs text-slate-600 font-mono py-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-8 w-8 text-slate-700 mb-2" }),
        "尚未添加任何组件。请在上方选择查找接口以装配智能体。"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: store.items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/80 p-2.5 shadow-sm text-xs font-mono",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-600 font-bold", children: [
                idx + 1,
                "."
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-100 font-semibold", children: item.lookup }),
                  item.pillar && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[10px] px-1 py-0", children: item.pillar })
                ] }),
                item.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-slate-500 font-sans mt-0.5", children: item.description })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => store.moveItem(idx, "up"),
                  disabled: idx === 0,
                  className: "p-1 rounded text-slate-400 hover:text-white disabled:opacity-30",
                  title: "上移",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "h-3.5 w-3.5" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => store.moveItem(idx, "down"),
                  disabled: idx === store.items.length - 1,
                  className: "p-1 rounded text-slate-400 hover:text-white disabled:opacity-30",
                  title: "下移",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "h-3.5 w-3.5" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => store.removeItem(item.id),
                  className: "p-1 rounded text-slate-500 hover:text-rose-400",
                  title: "移除",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" })
                }
              )
            ] })
          ]
        },
        item.id
      )) })
    ] })
  ] });
}
function DiagnosticsDrawer({
  isOpen,
  onClose,
  errorCount,
  warnCount,
  issues,
  onRefresh,
  loading
}) {
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-y-0 right-0 z-50 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: "合规检查与架构诊断" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onRefresh,
            disabled: loading,
            className: "text-slate-400 hover:text-indigo-400 transition-colors p-1",
            title: "重新检查",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `h-3.5 w-3.5 ${loading ? "animate-spin" : ""}` })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-around border-b border-slate-800 py-2 text-xs font-mono bg-slate-950/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-rose-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(OctagonAlert, { className: "h-4 w-4" }),
        " 错误: ",
        errorCount
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-amber-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" }),
        " 警告: ",
        warnCount
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs", children: issues.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex flex-col items-center justify-center text-slate-500 py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "h-10 w-10 text-emerald-400 mb-2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "所有知识库与清单均严格合规" })
    ] }) : issues.map((issue) => {
      const isErr = issue.level === "错误";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `rounded p-2.5 border ${isErr ? "border-rose-900/60 bg-rose-950/20 text-rose-200" : "border-amber-900/60 bg-amber-950/20 text-amber-200"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `font-semibold text-[10px] px-1.5 py-0.2 rounded ${isErr ? "bg-rose-900/80 text-rose-100" : "bg-amber-900/80 text-amber-100"}`,
                  children: issue.level
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 truncate max-w-[150px]", children: issue.code })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] leading-relaxed break-all font-sans", children: issue.message })
          ]
        },
        `${issue.level}-${issue.code}-${issue.message}`
      );
    }) })
  ] });
}
function PackageExplorer({
  packages,
  onSelectAtom
}) {
  const [expandedPkg, setExpandedPkg] = reactExports.useState({});
  const toggle = (pkgName) => {
    setExpandedPkg((prev) => ({ ...prev, [pkgName]: !prev[pkgName] }));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: packages.map((pkg) => {
    var _a;
    const isExp = !!expandedPkg[pkg.name];
    const exportsCount = Object.keys(pkg.exports || {}).length;
    const internalCount = Object.keys(pkg.internal_lookups || {}).length;
    const atomsCount = ((_a = pkg.atoms) == null ? void 0 : _a.length) || 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded border border-slate-800/60 bg-slate-900/30 overflow-hidden",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => toggle(pkg.name),
              className: "flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-800/40 text-xs font-mono transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  isExp ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3.5 w-3.5 text-slate-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "h-3.5 w-3.5 text-indigo-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200", children: pkg.name })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 text-[10px]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-500", children: [
                  atomsCount,
                  " 个原子"
                ] }) })
              ]
            }
          ),
          isExp && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 pb-2.5 pt-1 space-y-2 border-t border-slate-800/40 bg-slate-950/40", children: [
            exportsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mb-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-3 w-3" }),
                " 公开导出接口"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-2", children: Object.entries(pkg.exports).map(([k, def]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "text-xs font-mono text-slate-300 flex items-center justify-between",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: k }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[9px] px-1 py-0", children: def.pillar })
                  ]
                },
                k
              )) })
            ] }),
            internalCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-slate-400 flex items-center gap-1 mb-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3 w-3" }),
                " 内部私有查找"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-2", children: Object.entries(pkg.internal_lookups).map(([k, def]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "text-xs font-mono text-slate-400 flex items-center justify-between",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: k }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-slate-600", children: def.pillar })
                  ]
                },
                k
              )) })
            ] }),
            atomsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-slate-400 flex items-center gap-1 mb-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "h-3 w-3" }),
                " 包含原子清单"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-2", children: pkg.atoms.map((atom) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onSelectAtom == null ? void 0 : onSelectAtom(atom.id),
                  className: "w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded px-1.5 py-1 truncate flex items-center gap-1.5 transition-colors group",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: atom.id })
                  ]
                },
                atom.id
              )) })
            ] })
          ] })
        ]
      },
      pkg.name
    );
  }) });
}
function ManifestNode({ data }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-indigo-500/60 bg-indigo-950/80 p-3 shadow-lg shadow-indigo-950/50 min-w-[200px] text-slate-100 backdrop-blur", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-4 w-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "智能体清单" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-bold text-slate-100 truncate", children: data.label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-slate-400 font-mono mt-1", children: [
      "版本: ",
      data.version
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "source", position: Position.Right, className: "!bg-indigo-500 w-2.5 h-2.5" })
  ] });
}
function LookupNode({ data }) {
  var _a;
  const isBroken = data.isBroken;
  const isPrivate = data.isPrivate;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `rounded-md border p-2.5 min-w-[220px] backdrop-blur text-slate-200 transition-all ${isBroken ? "border-rose-600 bg-rose-950/80 shadow-rose-900/40" : isPrivate ? "border-amber-600 bg-amber-950/80" : "border-slate-800 bg-slate-900/90 shadow-md"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "target", position: Position.Left, className: "!bg-slate-400 w-2 h-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xs font-mono", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-3.5 w-3.5 text-slate-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              (_a = data.pillar) == null ? void 0 : _a.toUpperCase(),
              " 查找接口"
            ] })
          ] }),
          isBroken && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-[10px] text-rose-400 font-bold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3 w-3" }),
            " 引用断链"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-mono text-slate-100 font-bold truncate", children: data.key }),
        data.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-slate-400 mt-1 line-clamp-1", children: data.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "source", position: Position.Right, className: "!bg-slate-400 w-2 h-2" })
      ]
    }
  );
}
function AtomNode({ data }) {
  const typeVariantMap = {
    kernel: "kernel",
    d1: "d1",
    d2: "d2",
    d3: "d3"
  };
  const variant = typeVariantMap[data.type] || "default";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-slate-800 bg-slate-950/90 p-2.5 min-w-[200px] text-slate-100 shadow-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "target", position: Position.Left, className: "!bg-slate-500 w-2 h-2" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-1 mb-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant, className: "text-[10px] uppercase font-mono px-1.5 py-0", children: [
        data.type,
        data.priority !== void 0 && ` - 优先级 ${data.priority}`
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-mono truncate max-w-[80px]", children: data.package || "全局" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-mono font-medium text-slate-200 truncate", children: data.id }),
    data.type === "d2" && /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "source", position: Position.Right, className: "!bg-emerald-500 w-2 h-2" })
  ] });
}
const nodeTypes = {
  manifestNode: ManifestNode,
  lookupNode: LookupNode,
  atomNode: AtomNode
};
function autoLayout(nodes, edges) {
  var _a, _b;
  if (nodes.length === 0) return [];
  const adj = /* @__PURE__ */ new Map();
  const inDegree = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      (_a = adj.get(e.source)) == null ? void 0 : _a.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }
  const rank = /* @__PURE__ */ new Map();
  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      rank.set(id, 0);
      queue.push(id);
    }
  }
  if (queue.length === 0 && nodes.length > 0) {
    rank.set(nodes[0].id, 0);
    queue.push(nodes[0].id);
  }
  while (queue.length > 0) {
    const u = queue.shift();
    if (!u) continue;
    const currRank = rank.get(u) || 0;
    for (const v of adj.get(u) || []) {
      const nextRank = currRank + 1;
      const targetRank = rank.get(v);
      if (targetRank === void 0 || targetRank < nextRank) {
        rank.set(v, nextRank);
        queue.push(v);
      }
    }
  }
  for (const n of nodes) {
    if (!rank.has(n.id)) {
      rank.set(n.id, 0);
    }
  }
  const layers = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const r = rank.get(node.id) ?? 0;
    if (!layers.has(r)) layers.set(r, []);
    (_b = layers.get(r)) == null ? void 0 : _b.push(node);
  }
  const COLUMN_WIDTH = 340;
  const ROW_HEIGHT = 85;
  const X_OFFSET = 50;
  const Y_OFFSET = 40;
  const layoutedNodes = [];
  const sortedRanks = Array.from(layers.keys()).sort((a, b) => a - b);
  for (const r of sortedRanks) {
    const colNodes = layers.get(r) || [];
    colNodes.forEach((node, idx) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: X_OFFSET + r * COLUMN_WIDTH,
          y: Y_OFFSET + idx * ROW_HEIGHT
        }
      });
    });
  }
  return layoutedNodes;
}
function TopologyGraph({ manifest }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  reactExports.useEffect(() => {
    if (!manifest) return;
    fetch(`/api/graph?manifest=${encodeURIComponent(manifest)}`).then((res) => res.json()).then((data) => {
      const layoutedNodes = autoLayout(data.nodes || [], data.edges || []);
      setNodes(layoutedNodes);
      setEdges(data.edges || []);
    }).catch((err) => {
      console.error("获取拓扑数据失败:", err);
    });
  }, [manifest, setNodes, setEdges]);
  if (!manifest) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center text-xs text-slate-500 font-mono", children: "请在左侧选择清单以查看其依赖拓扑图" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full w-full bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    index,
    {
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      nodeTypes,
      fitView: true,
      minZoom: 0.2,
      maxZoom: 1.5,
      colorMode: "dark",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Background, { variant: BackgroundVariant.Dots, gap: 16, size: 1, color: "#334155" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Controls, {})
      ]
    }
  ) });
}
function App() {
  const [manifests, setManifests] = reactExports.useState([]);
  const [packages, setPackages] = reactExports.useState([]);
  const [selectedManifest, setSelectedManifest] = reactExports.useState("");
  const [prompt, setPrompt] = reactExports.useState("");
  const [status, setStatus] = reactExports.useState("检测中...");
  const [viewMode, setViewMode] = reactExports.useState("composer");
  const [leftTab, setLeftTab] = reactExports.useState("manifests");
  const [isCreateOpen, setIsCreateOpen] = reactExports.useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = reactExports.useState(false);
  const [lintLoading, setLintLoading] = reactExports.useState(false);
  const [lintErrors, setLintErrors] = reactExports.useState(0);
  const [lintWarnings, setLintWarnings] = reactExports.useState(0);
  const [lintIssues, setLintIssues] = reactExports.useState([]);
  const [editingAtomId, setEditingAtomId] = reactExports.useState(null);
  const composerItems = useComposerStore((state) => state.items);
  const loadManifestData = useComposerStore((state) => state.loadManifestData);
  const resetNewManifest = useComposerStore((state) => state.resetNewManifest);
  const fetchAssets = reactExports.useCallback(() => {
    fetch("/api/assets").then((res) => res.json()).then((data) => {
      setManifests(data.manifests || []);
      setPackages(data.packages || []);
      setSelectedManifest((prev) => {
        var _a;
        return prev || (((_a = data.manifests) == null ? void 0 : _a[0]) ?? "");
      });
    }).catch(() => {
      setManifests([]);
      setPackages([]);
    });
  }, []);
  const fetchLintReport = reactExports.useCallback(() => {
    setLintLoading(true);
    fetch("/api/lint").then((res) => res.json()).then((data) => {
      setLintErrors(data.error_count || 0);
      setLintWarnings(data.warn_count || 0);
      setLintIssues(data.issues || []);
    }).catch(console.error).finally(() => setLintLoading(false));
  }, []);
  reactExports.useEffect(() => {
    fetch("/api/health").then((res) => res.json()).then((data) => setStatus(data.status === "ok" ? "正常" : data.status)).catch(() => setStatus("离线"));
    fetchAssets();
    fetchLintReport();
    const eventSource = new EventSource("/api/events/stream");
    eventSource.addEventListener("change", () => {
      fetchAssets();
      fetchLintReport();
    });
    eventSource.onerror = () => {
    };
    return () => {
      eventSource.close();
    };
  }, [fetchAssets, fetchLintReport]);
  reactExports.useEffect(() => {
    if (composerItems.length === 0) return;
    const timer = setTimeout(() => {
      fetch("/api/compile-adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imports: composerItems.map((item) => ({ lookup: item.lookup }))
        })
      }).then((res) => res.json()).then((data) => {
        if (data.prompt) {
          setPrompt(data.prompt);
        }
      }).catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [composerItems]);
  const handleSelectManifest = async (mName) => {
    setSelectedManifest(mName);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: mName, is_file: false })
      });
      const data = await res.json();
      if (res.ok) {
        setPrompt(data.prompt);
      }
    } catch (e) {
      console.error(e);
    }
    try {
      const mRes = await fetch(`/api/manifests/${encodeURIComponent(mName)}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        loadManifestData(mData);
      }
    } catch (e) {
      console.error("回显清单数据失败:", e);
    }
  };
  const handleCreateNewManifest = () => {
    resetNewManifest();
    setSelectedManifest("");
    setPrompt("");
    setViewMode("composer");
  };
  const handleDeleteManifest = async (mName, e) => {
    e.stopPropagation();
    if (!window.confirm(`确定要删除清单 "${mName}" 吗？此操作不可逆。`)) {
      return;
    }
    try {
      const res = await fetch(`/api/manifests/${encodeURIComponent(mName)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchAssets();
        if (selectedManifest === mName) {
          handleCreateNewManifest();
        }
      } else {
        const data = await res.json();
        alert(`删除失败: ${data.detail}`);
      }
    } catch (_err) {
      alert("删除清单网络请求异常");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen flex-col bg-slate-950 text-slate-100", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex h-14 items-center justify-between border-b border-slate-800 px-6 bg-slate-900/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-6 w-6 text-indigo-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-lg font-bold tracking-wide", children: "ACA 工作台" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-indigo-300/80 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40", children: [
          "服务: ",
          status
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: () => setIsCreateOpen(true),
            className: "flex items-center gap-1.5 h-8 text-xs font-medium",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
              " 新建原子"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setIsDiagnosticsOpen(true),
            className: `flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors ${lintErrors > 0 ? "border-rose-600 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40" : lintWarnings > 0 ? "border-amber-600 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40" : "border-emerald-600 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40"}`,
            children: [
              lintErrors > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-3.5 w-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: lintErrors > 0 ? `${lintErrors} 处错误` : lintWarnings > 0 ? `${lintWarnings} 处警告` : "完全合规" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-80 border-r border-slate-800 p-4 flex flex-col space-y-3 bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded bg-slate-900 p-1 border border-slate-800 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setLeftTab("manifests"),
              className: `flex-1 py-1 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${leftTab === "manifests" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3.5 w-3.5" }),
                " 清单列表"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setLeftTab("packages"),
              className: `flex-1 py-1 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${leftTab === "packages" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "h-3.5 w-3.5" }),
                " 组件包"
              ]
            }
          )
        ] }),
        leftTab === "manifests" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleCreateNewManifest,
            className: "w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlus2, { className: "h-3.5 w-3.5 text-indigo-400" }),
              " 新建清单蓝图"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto space-y-1", children: leftTab === "manifests" ? manifests.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `group w-full flex items-center justify-between px-2 py-1 rounded text-xs font-mono transition-colors ${selectedManifest === m ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/50" : "text-slate-300 hover:bg-slate-900"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleSelectManifest(m),
                  className: "flex-1 text-left truncate py-1 px-1 hover:text-white",
                  children: m
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: (e) => handleDeleteManifest(m, e),
                  className: "opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-1 rounded",
                  title: "删除清单",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" })
                }
              )
            ]
          },
          m
        )) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          PackageExplorer,
          {
            packages,
            onSelectAtom: (atomId) => setEditingAtomId(atomId)
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 flex flex-col overflow-hidden bg-slate-900/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 text-xs font-mono", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "目标清单:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-indigo-300 font-bold", children: selectedManifest || "即席装配草稿" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center space-x-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded bg-slate-900 border border-slate-800 p-0.5 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setViewMode("composer"),
                className: `flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${viewMode === "composer" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { className: "h-3.5 w-3.5" }),
                  " 可视化装配"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setViewMode("graph"),
                className: `flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${viewMode === "graph" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { className: "h-3.5 w-3.5" }),
                  " 依赖拓扑图"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setViewMode("preview"),
                className: `flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${viewMode === "preview" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5" }),
                  " 全屏提示词预览"
                ]
              }
            )
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex overflow-hidden", children: [
          viewMode === "composer" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1/2 border-r border-slate-800 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(VisualComposer, { packages }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1/2 p-4 overflow-hidden bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PromptViewer, { value: prompt }) })
          ] }),
          viewMode === "graph" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TopologyGraph, { manifest: selectedManifest }) }),
          viewMode === "preview" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 p-4 h-full bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PromptViewer, { value: prompt }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateAtomModal,
      {
        isOpen: isCreateOpen,
        onClose: () => setIsCreateOpen(false),
        packages,
        onCreated: () => {
          fetchAssets();
          fetchLintReport();
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DiagnosticsDrawer,
      {
        isOpen: isDiagnosticsOpen,
        onClose: () => setIsDiagnosticsOpen(false),
        errorCount: lintErrors,
        warnCount: lintWarnings,
        issues: lintIssues,
        onRefresh: fetchLintReport,
        loading: lintLoading
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AtomEditorDrawer,
      {
        atomId: editingAtomId,
        isOpen: !!editingAtomId,
        onClose: () => setEditingAtomId(null),
        onSaved: () => {
          fetchAssets();
          fetchLintReport();
          if (selectedManifest) {
            handleSelectManifest(selectedManifest);
          }
        }
      }
    )
  ] });
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
