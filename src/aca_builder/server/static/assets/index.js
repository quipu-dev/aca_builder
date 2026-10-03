import { j as jsxRuntimeExports, c as create, p as persist, r as reactExports, S as Search, L as Layers, a as Sparkles, B as Box, R as React, b as LoaderCircle, C as CircleAlert, E as ExternalLink, T as Trash2, d as Check, e as Save, f as Shield, i as Tag, k as ReactCodeMirror, l as CodeXml, W as WandSparkles, m as ChartColumn, n as ChevronUp, o as ChevronDown, q as Copy, X, P as PenLine, M as Markdown, H as Handle, s as TriangleAlert, u as useNodesState, t as useEdgesState, v as Cpu, w as CircleCheckBig, x as index, y as Background, z as BackgroundVariant, A as Controls, N as Network, F as Filter, D as Plus, G as Link2, I as Eye, J as RotateCcw, K as EyeOff, O as SlidersVertical, Q as FilePlus2, U as MousePointerClick, V as Settings, Y as FolderTree, Z as Database, _ as ChevronRight, $ as FolderOpen, a0 as Folder, a1 as Package, a2 as Globe, a3 as Lock, a4 as FileCode, a5 as ArrowLeft, a6 as ArrowRight, a7 as RefreshCw, a8 as ShieldCheck, a9 as OctagonAlert, aa as ReactDOM } from "./vendor-react.js";
import { U as twMerge, W as clsx, X as remarkGfm } from "./vendor-others.js";
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
const INITIAL_EMPTY_TAB = {
  id: "empty:home",
  type: "empty",
  title: "开始",
  closable: false
};
const useIdeStore = create()(
  persist(
    (set, get) => ({
      tabs: [INITIAL_EMPTY_TAB],
      activeTabId: INITIAL_EMPTY_TAB.id,
      navigationHistory: [{ tab: INITIAL_EMPTY_TAB }],
      historyIndex: 0,
      tabSnapshots: {},
      saveSnapshot: (tabId, snapshot) => set((state) => ({
        tabSnapshots: {
          ...state.tabSnapshots,
          [tabId]: snapshot
        }
      })),
      getSnapshot: (tabId) => get().tabSnapshots[tabId],
      clearSnapshot: (tabId) => set((state) => {
        const rest = { ...state.tabSnapshots };
        delete rest[tabId];
        return { tabSnapshots: rest };
      }),
      sidebarOpen: true,
      sidebarWidth: 288,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      activeSidebarView: "explorer",
      bottomPanelOpen: false,
      activeBottomTab: "problems",
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveSidebarView: (view) => set({ activeSidebarView: view, sidebarOpen: true }),
      setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
      toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
      setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),
      preferences: { defaultRightPanel: "graph" },
      updatePreferences: (prefs) => set((state) => ({ preferences: { ...state.preferences, ...prefs } })),
      explorerExpanded: {},
      setExplorerExpanded: (path, expanded) => set((state) => ({
        explorerExpanded: { ...state.explorerExpanded, [path]: expanded }
      })),
      toggleExplorerExpanded: (path) => set((state) => ({
        explorerExpanded: {
          ...state.explorerExpanded,
          [path]: !state.explorerExpanded[path]
        }
      })),
      pinTab: (tabId) => set((state) => ({
        tabs: state.tabs.map((t) => t.id === tabId ? { ...t, isPreview: false } : t)
      })),
      openTab: (tab, options = false) => {
        const { tabs, navigationHistory, historyIndex } = get();
        const newTab = typeof options === "boolean" ? options : !!(options == null ? void 0 : options.newTab);
        const fromHistory = typeof options === "object" && !!(options == null ? void 0 : options.fromHistory);
        const isPreview = typeof options === "object" && (options == null ? void 0 : options.isPreview) !== void 0 ? options.isPreview : tab.isPreview ?? false;
        const tabToOpen = { ...tab, isPreview };
        if (!fromHistory) {
          const currentEntry = navigationHistory[historyIndex];
          if (!currentEntry || currentEntry.tab.id !== tabToOpen.id) {
            const truncated = navigationHistory.slice(0, historyIndex + 1);
            const updatedHistory = [...truncated, { tab: tabToOpen }];
            set({
              navigationHistory: updatedHistory,
              historyIndex: updatedHistory.length - 1
            });
          }
        }
        const existingIndex = tabs.findIndex((t) => t.id === tabToOpen.id);
        if (existingIndex !== -1) {
          if (!isPreview && tabs[existingIndex].isPreview) {
            const updated = [...tabs];
            updated[existingIndex] = { ...updated[existingIndex], isPreview: false };
            set({ tabs: updated, activeTabId: tabToOpen.id });
          } else {
            set({ activeTabId: tabToOpen.id });
          }
          return;
        }
        const previewIndex = tabs.findIndex((t) => t.isPreview && !t.isDirty);
        if (!newTab && isPreview && previewIndex !== -1) {
          const updatedTabs = [...tabs];
          updatedTabs[previewIndex] = tabToOpen;
          set({
            tabs: updatedTabs,
            activeTabId: tabToOpen.id
          });
          return;
        }
        const cleanTabs = tabs.length === 1 && tabs[0].type === "empty" && !tabs[0].isDirty ? [] : tabs;
        set({
          tabs: [...cleanTabs, tabToOpen],
          activeTabId: tabToOpen.id
        });
      },
      goBack: () => {
        const { historyIndex, navigationHistory } = get();
        if (historyIndex <= 0) return;
        const nextIndex = historyIndex - 1;
        const targetTab = navigationHistory[nextIndex].tab;
        set({ historyIndex: nextIndex });
        get().openTab(targetTab, { fromHistory: true });
      },
      goForward: () => {
        const { historyIndex, navigationHistory } = get();
        if (historyIndex >= navigationHistory.length - 1) return;
        const nextIndex = historyIndex + 1;
        const targetTab = navigationHistory[nextIndex].tab;
        set({ historyIndex: nextIndex });
        get().openTab(targetTab, { fromHistory: true });
      },
      closeTab: (tabId) => {
        var _a;
        const { tabs, activeTabId } = get();
        const target = tabs.find((t) => t.id === tabId);
        if (!target || !target.closable) return;
        const remaining = tabs.filter((t) => t.id !== tabId);
        let nextActiveId = activeTabId;
        if (remaining.length === 0) {
          const emptyTab = {
            id: "empty:home",
            type: "empty",
            title: "开始",
            closable: false
          };
          set({
            tabs: [emptyTab],
            activeTabId: emptyTab.id
          });
          return;
        }
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex((t) => t.id === tabId);
          const nextTab = remaining[Math.max(0, closedIndex - 1)];
          nextActiveId = nextTab ? nextTab.id : ((_a = remaining[0]) == null ? void 0 : _a.id) ?? "";
        }
        set({
          tabs: remaining,
          activeTabId: nextActiveId
        });
      },
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      setTabDirty: (tabId, isDirty) => set((state) => ({
        tabs: state.tabs.map(
          (t) => t.id === tabId ? {
            ...t,
            isDirty,
            // 一旦发生编辑修改，自动固定标签页
            isPreview: isDirty ? false : t.isPreview
          } : t
        )
      }))
    }),
    {
      name: "aca-studio-ide-v1",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        tabSnapshots: state.tabSnapshots,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        preferences: state.preferences,
        explorerExpanded: state.explorerExpanded
      })
    }
  )
);
function CommandPalette({
  isOpen,
  onClose,
  manifests,
  packages
}) {
  const openTab = useIdeStore((state) => state.openTab);
  const [query, setQuery] = reactExports.useState("");
  const [selectedIndex, setSelectedIndex] = reactExports.useState(0);
  const inputRef = reactExports.useRef(null);
  const allItems = reactExports.useMemo(() => {
    const list = [];
    for (const item of manifests) {
      const mName = typeof item === "string" ? item : item.name;
      const mWs = typeof item === "string" ? void 0 : item.workspace;
      list.push({
        id: `manifest:${mName}`,
        type: "manifest",
        title: mName,
        subtitle: mWs ? `清单蓝图 (@${mWs})` : "清单蓝图",
        badge: "MANIFEST",
        manifestName: mName
      });
    }
    for (const pkg of packages) {
      for (const [k, def] of Object.entries(pkg.exports || {})) {
        list.push({
          id: `lookup:${k}`,
          type: "lookup",
          title: k,
          subtitle: `公开接口 (@${pkg.name})`,
          badge: (def.pillar || "d1").toUpperCase(),
          lookupKey: k
        });
      }
      for (const [k, def] of Object.entries(pkg.internal_lookups || {})) {
        list.push({
          id: `lookup:${k}`,
          type: "lookup",
          title: k,
          subtitle: `内部查找 (@${pkg.name})`,
          badge: (def.pillar || "d1").toUpperCase(),
          lookupKey: k
        });
      }
      for (const atom of pkg.atoms || []) {
        list.push({
          id: `atom:${atom.id}`,
          type: "atom",
          title: atom.id,
          subtitle: `原子组件 (@${pkg.name})`,
          badge: atom.type.toUpperCase(),
          atomId: atom.id
        });
      }
    }
    return list;
  }, [manifests, packages]);
  const filteredItems = reactExports.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 50);
    return allItems.filter(
      (item) => {
        var _a;
        return item.title.toLowerCase().includes(q) || ((_a = item.subtitle) == null ? void 0 : _a.toLowerCase().includes(q));
      }
    ).slice(0, 50);
  }, [allItems, query]);
  reactExports.useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        var _a;
        return (_a = inputRef.current) == null ? void 0 : _a.focus();
      }, 50);
    }
  }, [isOpen]);
  const handleSelect = (item) => {
    if (item.type === "atom" && item.atomId) {
      openTab({
        id: `atom:${item.atomId}`,
        type: "atom",
        title: item.atomId,
        closable: true,
        atomId: item.atomId
      });
    } else if (item.type === "manifest" && item.manifestName) {
      openTab({
        id: `manifest:${item.manifestName}`,
        type: "manifest",
        title: item.manifestName,
        closable: true,
        manifestName: item.manifestName
      });
    } else if (item.type === "lookup" && item.lookupKey) {
      openTab({
        id: `lookup:${item.lookupKey}`,
        type: "lookup",
        title: item.lookupKey.split("::").pop() || item.lookupKey,
        closable: true,
        lookupKey: item.lookupKey
      });
    }
    onClose();
  };
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length)
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "presentation",
      className: "fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm",
      onClick: onClose,
      onKeyDown: (e) => {
        if (e.key === "Escape") onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col font-mono text-xs",
          onClick: (e) => e.stopPropagation(),
          onKeyDown: handleKeyDown,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center px-3.5 py-3 border-b border-slate-800 bg-slate-950/80 gap-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-4 w-4 text-indigo-400 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ref: inputRef,
                  type: "text",
                  value: query,
                  onChange: (e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  },
                  placeholder: "跳转到原子、清单蓝图或接口定义... (按 Esc 退出)",
                  className: "flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700", children: "Esc" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-80 overflow-y-auto p-1.5 space-y-0.5", children: filteredItems.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-500", children: "未找到匹配的资产" }) : filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => handleSelect(item),
                  onMouseEnter: () => setSelectedIndex(idx),
                  className: `w-full text-left flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/40" : "text-slate-300 hover:bg-slate-800/50 border border-transparent"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 truncate", children: [
                      item.type === "manifest" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-4 w-4 text-indigo-400 shrink-0" }) : item.type === "lookup" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-purple-400 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-4 w-4 text-emerald-400 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col truncate", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold truncate text-slate-100", children: item.title }),
                        item.subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 truncate", children: item.subtitle })
                      ] })
                    ] }),
                    item.badge && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[9px] px-1.5 py-0 uppercase", children: item.badge })
                  ]
                },
                item.id
              );
            }) })
          ]
        }
      )
    }
  );
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
function AtomEditorTab({
  atomId,
  packages = [],
  onSaved,
  onDeleted
}) {
  var _a;
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);
  const saveSnapshot = useIdeStore((state) => state.saveSnapshot);
  const getSnapshot = useIdeStore((state) => state.getSnapshot);
  const tabId = `atom:${atomId}`;
  const isDraft = atomId.startsWith("draft:") || atomId === "new_atom";
  const draftInitialPkg = isDraft ? atomId.replace("draft:", "") : "";
  const [isReady, setIsReady] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(!isDraft);
  const [saving, setSaving] = reactExports.useState(false);
  const [saveSuccess, setSaveSuccess] = reactExports.useState(false);
  const [errorMsg, setErrorMsg] = reactExports.useState("");
  const [currentId, setCurrentId] = reactExports.useState(isDraft ? "" : atomId);
  const [draftSuffix, setDraftSuffix] = reactExports.useState("");
  const [pkgName, setPkgName] = reactExports.useState(draftInitialPkg || ((_a = packages[0]) == null ? void 0 : _a.name) || "");
  const [sourceFile, setSourceFile] = reactExports.useState("");
  const [atomType, setAtomType] = reactExports.useState("d3");
  const [priority, setPriority] = reactExports.useState(1);
  const [domainList, setDomainList] = reactExports.useState([]);
  const [domainInput, setDomainInput] = reactExports.useState("");
  const [usesList, setUsesList] = reactExports.useState([]);
  const [usesInput, setUsesInput] = reactExports.useState("");
  const [content, setContent] = reactExports.useState(
    isDraft ? "# 新建原子组件\n\n在此输入具体的规则规范或程序技能..." : ""
  );
  const [isModified, setIsModified] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const snapshot = getSnapshot(tabId);
    if (snapshot) {
      setCurrentId(snapshot.currentId);
      setPkgName(snapshot.pkgName);
      setSourceFile(snapshot.sourceFile);
      setAtomType(snapshot.atomType);
      setPriority(snapshot.priority);
      setDomainList(snapshot.domainList);
      setUsesList(snapshot.usesList);
      setContent(snapshot.content);
      if (snapshot.draftSuffix !== void 0) setDraftSuffix(snapshot.draftSuffix);
      setIsModified(snapshot.isModified);
      setTabDirty(tabId, snapshot.isModified);
      setLoading(false);
      setIsReady(true);
      return;
    }
    if (isDraft) {
      setLoading(false);
      setIsReady(true);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    fetch(`/api/atoms/${encodeURIComponent(atomId)}`).then((res) => {
      if (!res.ok) throw new Error("加载原子失败");
      return res.json();
    }).then((data) => {
      const meta = data.meta || {};
      setCurrentId(atomId);
      setPkgName(data.package || "全局");
      setSourceFile(data.source_file || "");
      setAtomType(meta.type || "d1");
      setPriority(meta.priority !== void 0 ? meta.priority : 1);
      setDomainList(Array.isArray(meta.domain) ? meta.domain : []);
      setUsesList(Array.isArray(meta.uses) ? meta.uses : []);
      setContent(data.content || "");
      setIsModified(false);
      setTabDirty(tabId, false);
      setIsReady(true);
    }).catch((err) => {
      setErrorMsg(err.message || "加载异常");
    }).finally(() => setLoading(false));
  }, [atomId, isDraft, setTabDirty, tabId, getSnapshot]);
  reactExports.useEffect(() => {
    if (!isReady) return;
    saveSnapshot(tabId, {
      currentId,
      pkgName,
      sourceFile,
      atomType,
      priority,
      domainList,
      usesList,
      content,
      draftSuffix,
      isModified
    });
  }, [
    isReady,
    tabId,
    currentId,
    pkgName,
    sourceFile,
    atomType,
    priority,
    domainList,
    usesList,
    content,
    draftSuffix,
    isModified,
    saveSnapshot
  ]);
  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(`atom:${atomId}`, true);
    }
  };
  const handleOpenObsidian = async () => {
    if (!sourceFile) return;
    try {
      await fetch("/api/system/open-obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: sourceFile })
      });
    } catch (_err) {
    }
  };
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    if (isDraft) {
      const cleanSuffix = draftSuffix.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const generatedId = `${atomType}-${cleanSuffix}`;
      if (!pkgName || !cleanSuffix || !content.trim()) {
        setErrorMsg("请填写完整的所属包、标识后缀与正文");
        setSaving(false);
        return;
      }
      try {
        const res = await fetch("/api/atoms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            package: pkgName,
            id: generatedId,
            type: atomType,
            priority: atomType === "d3" ? priority : void 0,
            domain: domainList,
            uses: atomType === "d2" ? usesList : [],
            content
          })
        });
        const data = await res.json();
        if (res.ok) {
          setSaveSuccess(true);
          setIsModified(false);
          setTabDirty(`atom:${atomId}`, false);
          onSaved == null ? void 0 : onSaved();
          openTab({
            id: `atom:${generatedId}`,
            type: "atom",
            title: generatedId,
            closable: true,
            atomId: generatedId
          });
        } else {
          setErrorMsg(data.detail || "创建原子失败");
        }
      } catch (_err) {
        setErrorMsg("创建请求异常");
      } finally {
        setSaving(false);
      }
      return;
    }
    const newMeta = {
      id: currentId,
      type: atomType,
      domain: domainList,
      status: "stable"
    };
    if (atomType === "d3") {
      newMeta.priority = priority;
    }
    if (atomType === "d2") {
      newMeta.uses = usesList;
    }
    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(currentId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: newMeta,
          content
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setIsModified(false);
        setTabDirty(`atom:${atomId}`, false);
        onSaved == null ? void 0 : onSaved();
        setTimeout(() => setSaveSuccess(false), 2e3);
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "保存原子失败");
      }
    } catch (_err) {
      setErrorMsg("网络请求异常");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (isDraft) return;
    if (!window.confirm(`确定要永久删除原子组件 "${currentId}" 吗？此操作将物理删除文件。`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(currentId)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onDeleted == null ? void 0 : onDeleted();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "删除原子失败");
      }
    } catch (_err) {
      setErrorMsg("删除请求网络异常");
    } finally {
      setSaving(false);
    }
  };
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };
  const addDomainTag = () => {
    const trimmed = domainInput.trim().toLowerCase();
    if (trimmed && !domainList.includes(trimmed)) {
      setDomainList([...domainList, trimmed]);
      setDomainInput("");
      markDirty();
    }
  };
  const removeDomainTag = (tag) => {
    setDomainList(domainList.filter((t) => t !== tag));
    markDirty();
  };
  const addUsesRef = () => {
    const trimmed = usesInput.trim();
    if (trimmed && !usesList.includes(trimmed)) {
      setUsesList([...usesList, trimmed]);
      setUsesInput("");
      markDirty();
    }
  };
  const removeUsesRef = (ref) => {
    setUsesList(usesList.filter((u) => u !== ref));
    markDirty();
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full items-center justify-center text-xs text-slate-500 font-mono gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin text-indigo-400" }),
      "正在加载原子组件: ",
      atomId,
      "..."
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden",
      onKeyDown: handleKeyDown,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-mono text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 truncate", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Badge,
              {
                variant: atomType === "d1" ? "d1" : atomType === "d2" ? "d2" : atomType === "d3" ? "d3" : "kernel",
                className: "text-[10px] uppercase font-bold",
                children: [
                  atomType,
                  atomType === "d3" ? `-P${priority}` : ""
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-100 truncate", children: atomId }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-slate-500 truncate", children: [
              "@",
              pkgName
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            errorMsg && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-rose-400 flex items-center gap-1 font-sans", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-3 w-3" }),
              " ",
              errorMsg
            ] }),
            sourceFile && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: handleOpenObsidian,
                className: "flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded transition-colors text-[11px]",
                title: "在 Obsidian 中打开外部编辑",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Obsidian" })
                ]
              }
            ),
            !isDraft && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "outline",
                size: "sm",
                onClick: handleDelete,
                disabled: saving,
                className: "h-7 text-xs flex items-center gap-1 px-2 text-rose-400 border-rose-900/50 hover:bg-rose-950/50 hover:border-rose-700 cursor-pointer",
                title: "物理删除该原子 Markdown 文件",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "删除" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                onClick: handleSave,
                disabled: saving || !isModified,
                className: "h-7 text-xs flex items-center gap-1 px-2.5",
                children: [
                  saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : saveSuccess ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3 text-emerald-300" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3 w-3" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: saveSuccess ? "已保存" : "保存 (Ctrl+S)" })
                ]
              }
            )
          ] })
        ] }),
        isDraft && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-2.5 border-b border-slate-800 bg-indigo-950/20 grid grid-cols-3 gap-3 text-xs font-mono", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "atom-draft-pkg", className: "text-slate-400 block mb-1", children: "所属包" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: "atom-draft-pkg",
                value: pkgName,
                onChange: (e) => {
                  setPkgName(e.target.value);
                  markDirty();
                },
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500",
                children: packages.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.name, children: p.name }, p.name))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "atom-draft-type", className: "text-slate-400 block mb-1", children: "构造类别" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "atom-draft-type",
                value: atomType,
                onChange: (e) => {
                  setAtomType(e.target.value);
                  markDirty();
                },
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d3", children: "D3 控制基质" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d2", children: "D2 程序基质" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d1", children: "D1 陈述基质" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "atom-draft-suffix", className: "text-slate-400 block mb-1", children: [
              "标识后缀 (将自动生成: ",
              atomType,
              "-",
              draftSuffix || "...",
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "atom-draft-suffix",
                type: "text",
                value: draftSuffix,
                onChange: (e) => {
                  setDraftSuffix(e.target.value);
                  markDirty();
                },
                placeholder: "例如: core-operations",
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-slate-800/80 bg-slate-900/30 space-y-2.5 text-xs font-mono", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-6", children: [
            atomType === "d3" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-3.5 w-3.5 text-purple-400" }),
                " 优先级:"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: [
                { val: 0, label: "P0 公理" },
                { val: 1, label: "P1 原则" },
                { val: 2, label: "P2 指令" }
              ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  className: `flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer border text-[11px] transition-colors ${priority === item.val ? "border-purple-500 bg-purple-950/60 text-purple-200 font-semibold" : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "radio",
                        name: "atom-priority",
                        className: "hidden",
                        checked: priority === item.val,
                        onChange: () => {
                          setPriority(item.val);
                          markDirty();
                        }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label })
                  ]
                },
                item.val
              )) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 flex items-center gap-1 shrink-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "h-3.5 w-3.5 text-indigo-400" }),
                " 领域标签:"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5 flex-1", children: [
                domainList.map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[11px] border border-slate-700",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tag }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => removeDomainTag(tag),
                          className: "hover:text-rose-400",
                          children: "×"
                        }
                      )
                    ]
                  },
                  tag
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: domainInput,
                    onChange: (e) => setDomainInput(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDomainTag();
                      }
                    },
                    placeholder: "+ 添加标签 (回车)",
                    className: "bg-slate-950 border border-slate-800/80 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 w-32"
                  }
                )
              ] })
            ] })
          ] }),
          atomType === "d2" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 pt-1 border-t border-slate-800/40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 flex items-center gap-1 shrink-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3.5 w-3.5 text-emerald-400" }),
              " 依赖引用 (Uses):"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5 flex-1", children: [
              usesList.map((ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  className: "inline-flex items-center gap-1 bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded text-[11px] border border-emerald-800/60",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ref }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => removeUsesRef(ref),
                        className: "hover:text-rose-400 ml-1",
                        children: "×"
                      }
                    )
                  ]
                },
                ref
              )),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: usesInput,
                  onChange: (e) => setUsesInput(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUsesRef();
                    }
                  },
                  placeholder: "+ 关联 lookup (回车，例如 pkg::d1l-name)",
                  className: "bg-slate-950 border border-slate-800/80 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 w-64"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden p-2 bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ReactCodeMirror,
          {
            value: content,
            height: "100%",
            extensions: [markdown()],
            theme: "dark",
            onChange: (val) => {
              setContent(val);
              markDirty();
            },
            basicSetup: {
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true
            },
            className: "text-xs font-mono h-full"
          }
        ) })
      ]
    }
  );
}
function AtomChunkCard({
  chunk,
  onUpdated,
  onOpenObsidian,
  onSelectAtom,
  onOpenLookup
}) {
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [editContent, setEditContent] = reactExports.useState(chunk.content);
  const [saving, setSaving] = reactExports.useState(false);
  const [saveSuccess, setSaveSuccess] = reactExports.useState(false);
  const [errorMsg, setErrorMsg] = reactExports.useState("");
  const [editorHeight, setEditorHeight] = reactExports.useState(200);
  const previewContainerRef = reactExports.useRef(null);
  React.useEffect(() => {
    setEditContent(chunk.content);
  }, [chunk.content]);
  const handleStartEditing = () => {
    if (previewContainerRef.current) {
      const measuredHeight = previewContainerRef.current.getBoundingClientRect().height;
      setEditorHeight(Math.max(160, Math.round(measuredHeight)));
    }
    setIsEditing(true);
  };
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(chunk.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setIsEditing(false);
        onUpdated == null ? void 0 : onUpdated();
        setTimeout(() => setSaveSuccess(false), 2e3);
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "保存失败");
      }
    } catch (_err) {
      setErrorMsg("网络请求异常");
    } finally {
      setSaving(false);
    }
  };
  const getPillarBadgeVariant = (type) => {
    switch (type.toLowerCase()) {
      case "d1":
        return "d1";
      case "d2":
        return "d2";
      case "d3":
        return "d3";
      case "kernel":
        return "kernel";
      default:
        return "secondary";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `rounded-lg border transition-all duration-200 overflow-hidden shadow-sm ${isEditing ? "border-indigo-500/80 bg-slate-900/90 ring-1 ring-indigo-500/40" : saveSuccess ? "border-emerald-500/80 bg-slate-900/40 ring-1 ring-emerald-500/40" : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3.5 py-2 border-b border-slate-800/70 bg-slate-950/70 text-xs font-mono", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 truncate", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Badge,
              {
                variant: getPillarBadgeVariant(chunk.type),
                className: "text-[10px] uppercase font-bold px-1.5 py-0",
                children: [
                  chunk.type,
                  typeof chunk.priority === "number" ? `-P${chunk.priority}` : ""
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => onSelectAtom == null ? void 0 : onSelectAtom(chunk.id),
                className: "font-semibold text-slate-200 truncate hover:text-indigo-300 hover:underline cursor-pointer text-left",
                title: "点击打开原子组件编辑",
                children: chunk.id
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-500 truncate", children: [
              "@",
              chunk.package || "全局"
            ] }),
            chunk.via_lookups && chunk.via_lookups.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 truncate", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: "via:" }),
              chunk.via_lookups.map((lKey, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onOpenLookup == null ? void 0 : onOpenLookup(lKey),
                  className: "text-[10px] text-indigo-400/80 bg-indigo-950/60 border border-indigo-900/50 px-1.5 py-0.2 rounded truncate hover:text-indigo-200 hover:border-indigo-700 cursor-pointer",
                  title: `点击打开 Lookup 接口: ${lKey}`,
                  children: [
                    lKey,
                    i < chunk.via_lookups.length - 1 ? "," : ""
                  ]
                },
                lKey
              ))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
            errorMsg && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-rose-400 font-sans", children: errorMsg }),
            chunk.source_file && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  if (chunk.source_file) onOpenObsidian == null ? void 0 : onOpenObsidian(chunk.source_file);
                },
                className: "p-1 text-slate-400 hover:text-purple-300 rounded transition-colors",
                title: "在 Obsidian 中打开并编辑",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3.5 w-3.5" })
              }
            ),
            isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  onClick: handleSave,
                  disabled: saving,
                  className: "h-6 text-[11px] px-2 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500",
                  children: [
                    saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3 w-3" }),
                    "保存"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setEditContent(chunk.content);
                    setIsEditing(false);
                  },
                  className: "p-1 text-slate-400 hover:text-white rounded",
                  title: "取消编辑",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: handleStartEditing,
                className: "flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 px-2 py-0.5 rounded transition-colors",
                title: "就地编辑该原子正文",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { className: "h-3 w-3" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "编辑" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 text-xs", children: isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded border border-slate-800 overflow-hidden bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ReactCodeMirror,
          {
            value: editContent,
            height: `${editorHeight}px`,
            extensions: [markdown()],
            theme: "dark",
            onChange: (val) => setEditContent(val),
            basicSetup: {
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true
            },
            className: "text-xs font-mono"
          }
        ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: previewContainerRef,
            onDoubleClick: handleStartEditing,
            className: "cursor-text text-slate-300 select-text selection:bg-indigo-600/40 selection:text-indigo-100",
            title: "双击进入就地编辑模式",
            children: chunk.content ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "markdown-render", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Markdown, { remarkPlugins: [remarkGfm], children: chunk.content }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600 italic font-mono", children: "（该原子内容为空）" })
          }
        ) })
      ]
    }
  );
}
function PromptViewer({
  value,
  hookedValue,
  chunks = [],
  profile,
  onSelectAtom,
  onOpenLookup,
  onReload,
  isHookActive = false,
  onToggleHook
}) {
  var _a, _b, _c, _d;
  const [copied, setCopied] = reactExports.useState(false);
  const [showBreakdown, setShowBreakdown] = reactExports.useState(false);
  const [displayMode, setDisplayMode] = reactExports.useState("chunks");
  const currentDisplayPrompt = isHookActive && hookedValue ? hookedValue : value;
  const handleCopy = () => {
    if (!currentDisplayPrompt) return;
    navigator.clipboard.writeText(currentDisplayPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const handleOpenObsidian = async (filePath) => {
    try {
      await fetch("/api/system/open-obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath })
      });
    } catch (_err) {
    }
  };
  const lineCount = currentDisplayPrompt ? currentDisplayPrompt.split("\n").length : 0;
  const charCount = currentDisplayPrompt ? currentDisplayPrompt.length : 0;
  const estimatedTokens = (profile == null ? void 0 : profile.total_tokens) ?? Math.round(charCount / 3.8);
  const d3Tokens = ((_a = profile == null ? void 0 : profile.by_pillar) == null ? void 0 : _a.d3) || 0;
  const d2Tokens = ((_b = profile == null ? void 0 : profile.by_pillar) == null ? void 0 : _b.d2) || 0;
  const d1Tokens = ((_c = profile == null ? void 0 : profile.by_pillar) == null ? void 0 : _c.d1) || 0;
  const kernelTokens = ((_d = profile == null ? void 0 : profile.by_pillar) == null ? void 0 : _d.kernel) || 0;
  const totalProfileTokens = Math.max(1, (profile == null ? void 0 : profile.total_tokens) || 1);
  const d3Pct = Math.round(d3Tokens / totalProfileTokens * 100);
  const d2Pct = Math.round(d2Tokens / totalProfileTokens * 100);
  const d1Pct = Math.round(d1Tokens / totalProfileTokens * 100);
  const kernelPct = Math.round(kernelTokens / totalProfileTokens * 100);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3.5 py-1.5 border-b border-slate-800/60 bg-slate-900/60 text-xs font-mono text-slate-400 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-slate-200", children: chunks.length }),
          " 块"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-slate-200", children: lineCount }),
          " 行"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-indigo-400", children: [
            "~",
            estimatedTokens
          ] }),
          " tokens"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center rounded bg-slate-950 border border-slate-800/80 p-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setDisplayMode("chunks"),
              className: `flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${displayMode === "chunks" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-slate-200"}`,
              title: "分块卡片流呈现",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3 w-3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "分块" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setDisplayMode("raw"),
              className: `flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${displayMode === "raw" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-slate-200"}`,
              title: "完整纯文本视口",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { className: "h-3 w-3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "文本" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => onToggleHook == null ? void 0 : onToggleHook(!isHookActive),
            className: `flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border font-mono transition-colors ${isHookActive ? "border-amber-500/80 bg-amber-950/60 text-amber-200 font-semibold" : "border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-950/50"}`,
            title: `Post-process 钩子处理管道: ${isHookActive ? "已开启" : "已关闭"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Hook" })
            ]
          }
        ),
        profile && profile.atoms.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowBreakdown((prev) => !prev),
            className: `flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${showBreakdown ? "border-indigo-500/80 bg-indigo-950/60 text-indigo-200" : "border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-950/50"}`,
            title: "查看各原子 Token 消耗排行",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "h-3 w-3 text-indigo-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "分布" }),
              showBreakdown ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleCopy,
            disabled: !currentDisplayPrompt,
            className: "h-6 text-[11px] px-2 flex items-center gap-1 border-slate-800 bg-slate-950/50 hover:bg-slate-800",
            children: [
              copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3 text-emerald-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: copied ? "已复制" : "复制" })
            ]
          }
        )
      ] })
    ] }),
    profile && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-2 border-b border-slate-800/60 bg-slate-950", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full h-2 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800/50", children: [
        kernelTokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: { width: `${kernelPct}%` },
            className: "bg-amber-500 hover:brightness-125 transition-all",
            title: `Kernel 核心协议: ${kernelTokens} tokens (${kernelPct}%)`
          }
        ),
        d3Tokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: { width: `${d3Pct}%` },
            className: "bg-purple-500 hover:brightness-125 transition-all",
            title: `D3 控制基质: ${d3Tokens} tokens (${d3Pct}%)`
          }
        ),
        d2Tokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: { width: `${d2Pct}%` },
            className: "bg-emerald-500 hover:brightness-125 transition-all",
            title: `D2 程序基质: ${d2Tokens} tokens (${d2Pct}%)`
          }
        ),
        d1Tokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: { width: `${d1Pct}%` },
            className: "bg-cyan-500 hover:brightness-125 transition-all",
            title: `D1 陈述基质: ${d1Tokens} tokens (${d1Pct}%)`
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-amber-500" }),
          "Kernel: ",
          kernelTokens,
          " (",
          kernelPct,
          "%)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-purple-500" }),
          "D3: ",
          d3Tokens,
          " (",
          d3Pct,
          "%)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }),
          "D2: ",
          d2Tokens,
          " (",
          d2Pct,
          "%)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-cyan-500" }),
          "D1: ",
          d1Tokens,
          " (",
          d1Pct,
          "%)"
        ] })
      ] })
    ] }),
    showBreakdown && profile && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-48 overflow-y-auto border-b border-slate-800 bg-slate-900/95 p-3 space-y-1.5 text-xs font-mono", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "组件词元消耗排行 (按估算 Token 降序)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-normal", children: "点击原子可定位编辑" })
      ] }),
      profile.atoms.map((atom, idx) => {
        const pct = Math.round(atom.estimated_tokens / totalProfileTokens * 100);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/50 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 truncate", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-600 font-bold w-4 text-right", children: [
                  idx + 1,
                  "."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onSelectAtom == null ? void 0 : onSelectAtom(atom.id),
                    className: "text-slate-200 hover:text-indigo-400 font-medium truncate text-left",
                    title: atom.id,
                    children: atom.id
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400", children: atom.type })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 shrink-0 text-slate-400 text-[11px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  atom.estimated_tokens,
                  " tokens"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-indigo-400 w-8 text-right", children: [
                  pct,
                  "%"
                ] })
              ] })
            ]
          },
          atom.id
        );
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto p-3", children: displayMode === "chunks" && !isHookActive ? chunks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col items-center justify-center text-xs text-slate-600 font-mono", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-8 w-8 text-slate-700 mb-2" }),
      "暂无装配好的原子块"
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: chunks.map((chunk) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      AtomChunkCard,
      {
        chunk,
        onUpdated: onReload,
        onOpenObsidian: handleOpenObsidian,
        onSelectAtom,
        onOpenLookup
      },
      chunk.id
    )) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full", children: [
      isHookActive && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 px-3 py-1.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "当前正处于 After 钩子处理后的纯文本视口（只读）。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        ReactCodeMirror,
        {
          value: currentDisplayPrompt,
          height: "100%",
          extensions: [markdown()],
          editable: false,
          theme: "dark",
          basicSetup: {
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false
          },
          className: "text-xs font-mono h-full"
        }
      )
    ] }) })
  ] });
}
function SplitPane({
  direction = "horizontal",
  initialRatio = 0.5,
  minPrimarySize = 240,
  minSecondarySize = 240,
  primary,
  secondary,
  className = "",
  onResize
}) {
  const containerRef = reactExports.useRef(null);
  const [ratio, setRatio] = reactExports.useState(initialRatio);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const isHorizontal = direction === "horizontal";
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handlePointerMove = reactExports.useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio;
      if (isHorizontal) {
        const offset = e.clientX - rect.left;
        const total = rect.width;
        if (offset < minPrimarySize || total - offset < minSecondarySize) return;
        newRatio = Math.max(0.15, Math.min(0.85, offset / total));
      } else {
        const offset = e.clientY - rect.top;
        const total = rect.height;
        if (offset < minPrimarySize || total - offset < minSecondarySize) return;
        newRatio = Math.max(0.15, Math.min(0.85, offset / total));
      }
      setRatio(newRatio);
      onResize == null ? void 0 : onResize(newRatio);
    },
    [isDragging, isHorizontal, minPrimarySize, minSecondarySize, onResize]
  );
  const handlePointerUp = reactExports.useCallback(() => {
    setIsDragging(false);
  }, []);
  reactExports.useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: containerRef,
      className: `relative flex h-full w-full overflow-hidden ${isHorizontal ? "flex-row" : "flex-col"} ${className}`,
      style: { userSelect: isDragging ? "none" : "auto" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              flex: `0 0 ${ratio * 100}%`,
              overflow: "hidden"
            },
            className: "h-full",
            children: primary
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            onPointerDown: handlePointerDown,
            className: `relative z-20 shrink-0 group flex items-center justify-center transition-colors ${isHorizontal ? "w-1.5 cursor-col-resize hover:bg-indigo-500/60" : "h-1.5 cursor-row-resize hover:bg-indigo-500/60"} ${isDragging ? "bg-indigo-500" : "bg-slate-800"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: `rounded-full bg-slate-600 group-hover:bg-white transition-colors ${isHorizontal ? "h-8 w-1" : "w-8 h-1"} ${isDragging ? "!bg-white" : ""}`
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              flex: `1 1 ${(1 - ratio) * 100}%`,
              overflow: "hidden"
            },
            className: "h-full",
            children: secondary
          }
        )
      ]
    }
  );
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
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "w-full text-left text-xs font-mono text-slate-100 font-bold truncate cursor-pointer hover:text-indigo-300 hover:underline bg-transparent border-none p-0",
            onClick: () => {
              var _a2;
              return (_a2 = data.onEdit) == null ? void 0 : _a2.call(data, data.key);
            },
            title: "点击编辑查找接口契约",
            children: data.key
          }
        ),
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-slate-800 bg-slate-950/90 p-2.5 text-slate-100 shadow-md transition-all min-w-[200px] max-w-[240px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "target", position: Position.Left, className: "!bg-slate-500 w-2 h-2" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-1 mb-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant, className: "text-[10px] uppercase font-mono px-1.5 py-0", children: [
        data.type,
        typeof data.priority === "number" && `-P${data.priority}`
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-mono truncate max-w-[70px]", children: data.package || "全局" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: "text-xs font-mono font-medium text-slate-200 truncate flex-1 text-left cursor-pointer hover:text-indigo-300 hover:underline bg-transparent border-none p-0",
        onClick: () => {
          var _a;
          return (_a = data.onEdit) == null ? void 0 : _a.call(data, data.id);
        },
        title: `点击打开原子 ${data.id} 编辑`,
        children: data.id
      }
    ) }),
    data.type === "d2" && /* @__PURE__ */ jsxRuntimeExports.jsx(Handle, { type: "source", position: Position.Right, className: "!bg-emerald-500 w-2 h-2" })
  ] });
}
const nodeTypes = {
  manifestNode: ManifestNode,
  lookupNode: LookupNode,
  atomNode: AtomNode
};
function autoLayoutSafe(nodes, edges) {
  var _a, _b;
  if (nodes.length === 0) return { nodes: [], hasCycle: false, cycleNodes: [] };
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
  const nodeVisitCount = /* @__PURE__ */ new Map();
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      rank.set(id, 0);
      queue.push(id);
      nodeVisitCount.set(id, 1);
    }
  }
  if (queue.length === 0 && nodes.length > 0) {
    rank.set(nodes[0].id, 0);
    queue.push(nodes[0].id);
    nodeVisitCount.set(nodes[0].id, 1);
  }
  let hasCycle = false;
  const cycleNodesSet = /* @__PURE__ */ new Set();
  const maxAllowedDepth = nodes.length;
  let steps = 0;
  const MAX_STEPS = nodes.length * 5;
  while (queue.length > 0 && steps < MAX_STEPS) {
    steps++;
    const u = queue.shift();
    if (!u) continue;
    const currRank = rank.get(u) || 0;
    for (const v of adj.get(u) || []) {
      const nextRank = currRank + 1;
      if (nextRank >= maxAllowedDepth) {
        hasCycle = true;
        cycleNodesSet.add(v);
        continue;
      }
      const targetRank = rank.get(v);
      if (targetRank === void 0 || targetRank < nextRank) {
        rank.set(v, nextRank);
        const count = (nodeVisitCount.get(v) || 0) + 1;
        nodeVisitCount.set(v, count);
        if (count < 4) {
          queue.push(v);
        } else {
          hasCycle = true;
          cycleNodesSet.add(v);
        }
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
  const ROW_HEIGHT = 90;
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
  return {
    nodes: layoutedNodes,
    hasCycle,
    cycleNodes: Array.from(cycleNodesSet)
  };
}
const TopologyGraph = React.memo(function TopologyGraph2({
  manifest,
  imports,
  overrides,
  lookupAdhoc,
  onSelectAtom,
  onSelectLookup
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [errorMsg, setErrorMsg] = reactExports.useState("");
  const [telemetry, setTelemetry] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorMsg("");
      const fetchPromise = lookupAdhoc !== void 0 ? fetch("/api/lookups/graph-adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lookupAdhoc)
      }) : imports !== void 0 ? fetch("/api/graph/adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manifest || "draft",
          imports,
          overrides: overrides && Object.keys(overrides).length > 0 ? overrides : void 0
        })
      }) : manifest ? fetch(`/api/graph?manifest=${encodeURIComponent(manifest)}`) : null;
      if (!fetchPromise) {
        setLoading(false);
        return;
      }
      fetchPromise.then((res) => {
        if (!res.ok) throw new Error(`HTTP 状态码 ${res.status}: 获取拓扑失败`);
        return res.json();
      }).then((data) => {
        if (isCancelled) return;
        const tFetch = performance.now();
        const layoutRes = autoLayoutSafe(data.nodes || [], data.edges || []);
        const tLayout = performance.now();
        const layoutDuration = tLayout - tFetch;
        const connectedNodes = layoutRes.nodes.map((n) => {
          if (n.type === "atomNode") {
            return {
              ...n,
              data: {
                ...n.data,
                onEdit: onSelectAtom
              }
            };
          }
          if (n.type === "lookupNode") {
            return {
              ...n,
              data: {
                ...n.data,
                onEdit: onSelectLookup
              }
            };
          }
          return n;
        });
        setNodes(connectedNodes);
        setEdges(data.edges || []);
        setTelemetry({
          nodeCount: connectedNodes.length,
          edgeCount: (data.edges || []).length,
          layoutMs: Math.round(layoutDuration),
          hasCycle: layoutRes.hasCycle
        });
      }).catch((err) => {
        if (isCancelled) return;
        setErrorMsg(err.message || "加载拓扑图异常");
      }).finally(() => {
        if (!isCancelled) setLoading(false);
      });
    }, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [manifest, imports, overrides, lookupAdhoc, onSelectAtom, onSelectLookup, setNodes, setEdges]);
  if (!manifest && (!imports || imports.length === 0) && !lookupAdhoc) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center text-xs text-slate-500 font-mono", children: "请选择或添加组件以呈现拓扑关系" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full w-full bg-slate-950 relative overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur px-3 py-1.5 rounded-md font-mono text-[11px] shadow-lg", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-indigo-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
      " 计算依赖拓扑..."
    ] }) : errorMsg ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-rose-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" }),
      " ",
      errorMsg
    ] }) : telemetry ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-3.5 w-3.5 text-indigo-400" }),
        "节点: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-slate-100", children: telemetry.nodeCount })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "边: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-slate-100", children: telemetry.edgeCount })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-500", children: [
        telemetry.layoutMs,
        "ms"
      ] }),
      telemetry.hasCycle ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.2 rounded font-bold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3 w-3" }),
        " 检测到循环依赖"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-emerald-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "h-3 w-3" }),
        " DAG 良好"
      ] })
    ] }) : null }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      index,
      {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        nodeTypes,
        fitView: true,
        minZoom: 0.15,
        maxZoom: 1.5,
        colorMode: "dark",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Background, { variant: BackgroundVariant.Dots, gap: 16, size: 1, color: "#334155" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Controls, {})
        ]
      }
    )
  ] });
});
function LookupEditorTab({
  lookupKey,
  packages,
  onSaved,
  onDeleted
}) {
  var _a;
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);
  const saveSnapshot = useIdeStore((state) => state.saveSnapshot);
  const getSnapshot = useIdeStore((state) => state.getSnapshot);
  const isDraft = lookupKey.startsWith("draft:");
  const initialPkg = isDraft ? lookupKey.replace("draft:", "") : "";
  const [isReady, setIsReady] = reactExports.useState(false);
  const [pkgName, setPkgName] = reactExports.useState(initialPkg || ((_a = packages[0]) == null ? void 0 : _a.name) || "");
  const [isPublic, setIsPublic] = reactExports.useState(true);
  const [pillar, setPillar] = reactExports.useState("d1");
  const [rawKeyName, setRawKeyName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [selectors, setSelectors] = reactExports.useState([]);
  const [isModified, setIsModified] = reactExports.useState(false);
  const preferences = useIdeStore((state) => state.preferences);
  const [rightView, setRightView] = reactExports.useState(
    (preferences == null ? void 0 : preferences.defaultRightPanel) === "prompt" ? "prompt" : "graph"
  );
  const [matchedAtoms, setMatchedAtoms] = reactExports.useState([]);
  const [evaluating, setEvaluating] = reactExports.useState(false);
  const [evalError, setEvalError] = reactExports.useState("");
  const [slicePrompt, setSlicePrompt] = reactExports.useState("");
  const [sliceChunks, setSliceChunks] = reactExports.useState([]);
  const [sliceProfile, setProfile] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [saveStatus, setSaveStatus] = reactExports.useState("");
  const [selectorMode, setSelectorMode] = reactExports.useState("id");
  const [queryIdInput, setQueryIdInput] = reactExports.useState("");
  const [domainInput, setDomainInput] = reactExports.useState("");
  const [refInput, setRefInput] = reactExports.useState("");
  const candidateLookupRefs = packages.flatMap((pkg) => {
    const list = [];
    for (const key of Object.keys(pkg.exports || {})) {
      list.push(key);
    }
    for (const key of Object.keys(pkg.internal_lookups || {})) {
      list.push(key);
    }
    return list;
  });
  const tabId = `lookup:${lookupKey}`;
  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  };
  reactExports.useEffect(() => {
    var _a2, _b, _c, _d, _e;
    const snapshot = getSnapshot(tabId);
    if (snapshot) {
      setPkgName(snapshot.pkgName);
      setIsPublic(snapshot.isPublic);
      setPillar(snapshot.pillar);
      setRawKeyName(snapshot.rawKeyName);
      setDescription(snapshot.description);
      setSelectors(snapshot.selectors);
      if (snapshot.rightView) setRightView(snapshot.rightView);
      setIsModified(snapshot.isModified);
      setTabDirty(tabId, snapshot.isModified);
      setIsReady(true);
      return;
    }
    if (isDraft) {
      setIsReady(true);
      return;
    }
    const rawKey = lookupKey.includes("::") ? lookupKey.split("::")[1] : lookupKey;
    const targetPkg = lookupKey.includes("::") ? lookupKey.split("::")[0] : null;
    for (const pkg of packages) {
      if (targetPkg && pkg.name !== targetPkg) continue;
      const exportDef = ((_a2 = pkg.exports) == null ? void 0 : _a2[lookupKey]) || ((_b = pkg.exports) == null ? void 0 : _b[`${pkg.name}::${rawKey}`]) || ((_c = pkg.exports) == null ? void 0 : _c[rawKey]);
      if (exportDef) {
        setPkgName(pkg.name);
        setPillar(exportDef.pillar || "d1");
        setIsPublic(true);
        setDescription(exportDef.description || "");
        setRawKeyName(rawKey.replace(/^d[1-3]l-/, "") || "");
        setSelectors(exportDef.selectors || []);
        setIsReady(true);
        return;
      }
      const internalDef = ((_d = pkg.internal_lookups) == null ? void 0 : _d[lookupKey]) || ((_e = pkg.internal_lookups) == null ? void 0 : _e[rawKey]);
      if (internalDef) {
        setPkgName(pkg.name);
        setPillar(internalDef.pillar || "d1");
        setIsPublic(false);
        setDescription(internalDef.description || "");
        setRawKeyName(rawKey.replace(/^d[1-3]l-/, "") || "");
        setSelectors(internalDef.selectors || []);
        setIsReady(true);
        return;
      }
    }
  }, [lookupKey, packages, isDraft, tabId, getSnapshot, setTabDirty]);
  reactExports.useEffect(() => {
    if (!isReady) return;
    saveSnapshot(tabId, {
      pkgName,
      isPublic,
      pillar,
      rawKeyName,
      description,
      selectors,
      rightView,
      isModified
    });
  }, [
    isReady,
    tabId,
    pkgName,
    isPublic,
    pillar,
    rawKeyName,
    description,
    selectors,
    rightView,
    isModified,
    saveSnapshot
  ]);
  const runLiveDebug = reactExports.useCallback(() => {
    if (selectors.length === 0) {
      setMatchedAtoms([]);
      setSlicePrompt("");
      setSliceChunks([]);
      setProfile(null);
      setEvalError("");
      return;
    }
    setEvaluating(true);
    setEvalError("");
    const targetKey = `${pillar}l-${rawKeyName.trim() || "adhoc"}`;
    if (rightView === "prompt") {
      fetch("/api/lookups/compile-adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: targetKey,
          selectors,
          package: pkgName,
          pillar
        })
      }).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: 编译切片失败`);
        return res.json();
      }).then((data) => {
        setSlicePrompt(data.prompt || "");
        setSliceChunks(data.chunks || []);
        setProfile(data.profile || null);
      }).catch((err) => {
        setEvalError(err.message || "编译切片请求异常");
      }).finally(() => setEvaluating(false));
    } else {
      fetch("/api/lookups/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectors,
          package: pkgName,
          pillar
        })
      }).then((res) => res.json()).then((data) => {
        if (data.error) {
          setEvalError(data.error);
          setMatchedAtoms([]);
        } else {
          setMatchedAtoms(data.matched_atoms || []);
        }
      }).catch((err) => {
        setEvalError(err.message || "演算请求失败");
      }).finally(() => setEvaluating(false));
    }
  }, [selectors, pkgName, pillar, rawKeyName, rightView]);
  reactExports.useEffect(() => {
    const timer = setTimeout(() => {
      runLiveDebug();
    }, 200);
    return () => clearTimeout(timer);
  }, [runLiveDebug]);
  const currentPkgObj = packages.find((p) => p.name === pkgName);
  const currentPillarAtoms = ((currentPkgObj == null ? void 0 : currentPkgObj.atoms) || []).filter((a) => a.type === pillar);
  const handleAddSelector = () => {
    if (selectorMode === "id" && queryIdInput.trim()) {
      setSelectors([...selectors, { query: { id: queryIdInput.trim() } }]);
      setQueryIdInput("");
      markDirty();
    } else if (selectorMode === "domain" && domainInput.trim()) {
      const domains = domainInput.split(",").map((s) => s.trim()).filter(Boolean);
      setSelectors([...selectors, { query: { domain: domains } }]);
      setDomainInput("");
      markDirty();
    } else if (selectorMode === "ref" && refInput.trim()) {
      setSelectors([...selectors, { ref: refInput.trim() }]);
      setRefInput("");
      markDirty();
    }
  };
  const handleRemoveSelector = (index2) => {
    setSelectors(selectors.filter((_, i) => i !== index2));
    markDirty();
  };
  const handleSave = async () => {
    const cleanSuffix = rawKeyName.trim().toLowerCase().replace(/^d[1-3]l-/, "").replace(/[^a-z0-9_-]/g, "-");
    if (!cleanSuffix || selectors.length === 0) return;
    setSaving(true);
    setSaveStatus("正在写入...");
    try {
      const res = await fetch("/api/lookups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: pkgName,
          key: `${pillar}l-${cleanSuffix}`,
          pillar,
          is_public: isPublic,
          description: description.trim(),
          selectors
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("已保存");
        setIsModified(false);
        setTabDirty(tabId, false);
        onSaved == null ? void 0 : onSaved();
        setTimeout(() => setSaveStatus(""), 2500);
      } else {
        setSaveStatus(`保存失败: ${data.detail}`);
      }
    } catch (_err) {
      setSaveStatus("保存请求异常");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (isDraft) return;
    if (!window.confirm(`确定要删除查找接口 "${lookupKey}" 吗？此操作将从包定义中移除。`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/lookups/${encodeURIComponent(lookupKey)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onDeleted == null ? void 0 : onDeleted();
      } else {
        const data = await res.json();
        setSaveStatus(`删除失败: ${data.detail}`);
      }
    } catch (_err) {
      setSaveStatus("删除请求网络异常");
    } finally {
      setSaving(false);
    }
  };
  const fullLookupKey = `${pillar}l-${rawKeyName.trim() || "..."}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden select-none font-mono", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200", children: fullLookupKey }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[10px] uppercase font-bold px-1.5 py-0", children: pillar }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-500 text-[11px]", children: [
          "@",
          pkgName
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        saveStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-indigo-400", children: saveStatus }),
        !isDraft && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleDelete,
            disabled: saving,
            className: "h-7 text-xs flex items-center gap-1 px-2.5 text-rose-400 border-rose-900/50 hover:bg-rose-950/50 hover:border-rose-700 cursor-pointer",
            title: "删除此接口契约",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "删除接口" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: handleSave,
            disabled: saving || selectors.length === 0,
            className: "h-7 text-xs flex items-center gap-1.5 px-3 bg-indigo-600 hover:bg-indigo-500",
            children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "保存接口定义" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      SplitPane,
      {
        direction: "horizontal",
        initialRatio: 0.52,
        minPrimarySize: 380,
        minSecondarySize: 320,
        primary: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex flex-col p-4 space-y-4 overflow-y-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-indigo-400 font-semibold mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "接口契约规范" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lookup-pkg", className: "text-slate-400 block mb-1", children: "所属组件包" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "select",
                  {
                    id: "lookup-pkg",
                    value: pkgName,
                    onChange: (e) => {
                      setPkgName(e.target.value);
                      markDirty();
                    },
                    className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500",
                    children: packages.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.name, children: p.name }, p.name))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lookup-visibility", className: "text-slate-400 block mb-1", children: "可见性契约" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    id: "lookup-visibility",
                    value: isPublic ? "public" : "private",
                    onChange: (e) => {
                      setIsPublic(e.target.value === "public");
                      markDirty();
                    },
                    className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "public", children: "公开导出 (package.yaml exports)" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "private", children: "内部私有 (d4/lookups.yaml)" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lookup-pillar", className: "text-slate-400 block mb-1", children: "构造类别" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    id: "lookup-pillar",
                    value: pillar,
                    onChange: (e) => {
                      setPillar(e.target.value);
                      markDirty();
                    },
                    className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d1", children: "D1 陈述基质 (d1l-*)" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d2", children: "D2 程序基质 (d2l-*)" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "d3", children: "D3 控制基质 (d3l-*)" })
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lookup-key-name", className: "text-slate-400 block mb-1", children: "后缀标识符" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "lookup-key-name",
                    type: "text",
                    value: rawKeyName,
                    onChange: (e) => {
                      setRawKeyName(e.target.value);
                      markDirty();
                    },
                    placeholder: "例如: core-safety",
                    className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lookup-desc", className: "text-slate-400 block mb-1", children: "描述说明" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "lookup-desc",
                    type: "text",
                    value: description,
                    onChange: (e) => {
                      setDescription(e.target.value);
                      markDirty();
                    },
                    placeholder: "导出该模块的基础协议与守则",
                    className: "w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-slate-300 font-semibold", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { className: "h-4 w-4 text-indigo-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "选择器构建器 (Selectors Builder)" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded bg-slate-950 p-0.5 border border-slate-800 text-[11px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSelectorMode("id"),
                    className: `px-2 py-0.5 rounded transition-colors ${selectorMode === "id" ? "bg-indigo-600 text-white" : "text-slate-400"}`,
                    children: "按原子 ID 选取"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSelectorMode("domain"),
                    className: `px-2 py-0.5 rounded transition-colors ${selectorMode === "domain" ? "bg-indigo-600 text-white" : "text-slate-400"}`,
                    children: "按 Domain 领域查询"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSelectorMode("ref"),
                    className: `px-2 py-0.5 rounded transition-colors ${selectorMode === "ref" ? "bg-indigo-600 text-white" : "text-slate-400"}`,
                    children: "跨 Lookup 引用"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              selectorMode === "id" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: queryIdInput,
                    onChange: (e) => setQueryIdInput(e.target.value),
                    className: "flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "", children: [
                        "-- 点选当前包内的 ",
                        pillar.toUpperCase(),
                        " 原子 --"
                      ] }),
                      currentPillarAtoms.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: a.id, children: a.id }, a.id))
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: queryIdInput,
                    onChange: (e) => setQueryIdInput(e.target.value),
                    placeholder: "或直接手填 ID",
                    className: "w-40 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                  }
                )
              ] }),
              selectorMode === "domain" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: domainInput,
                  onChange: (e) => setDomainInput(e.target.value),
                  placeholder: "输入领域标签，用逗号分隔，支持 - 排除，如: reasoning, -experimental",
                  className: "flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                }
              ),
              selectorMode === "ref" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    list: "lookup-ref-candidates",
                    value: refInput,
                    onChange: (e) => setRefInput(e.target.value),
                    placeholder: "输入或选择引用的另一个 lookup，如 pkg::d1l-name",
                    className: "flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "lookup-ref-candidates", children: candidateLookupRefs.map((refKey) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: refKey }, refKey)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  onClick: handleAddSelector,
                  className: "h-7 text-xs flex items-center gap-1 shrink-0",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
                    " 追加规则"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 pt-2 border-t border-slate-800/60", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-slate-400", children: [
                "已配置规则 (",
                selectors.length,
                " 项):"
              ] }),
              selectors.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-slate-600 text-center py-6", children: "尚未配置任何规则，请在上方添加选择器。" }) : selectors.map((sel, idx) => {
                var _a2, _b;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-950/80 text-xs",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-600 font-bold", children: [
                          idx + 1,
                          "."
                        ] }),
                        ((_a2 = sel.query) == null ? void 0 : _a2.id) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-indigo-300", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-3 w-3 text-slate-400" }),
                          "精确 ID: ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: sel.query.id })
                        ] }),
                        ((_b = sel.query) == null ? void 0 : _b.domain) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-emerald-300", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "h-3 w-3 text-slate-400" }),
                          "Domain 匹配: ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: JSON.stringify(sel.query.domain) })
                        ] }),
                        sel.ref && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-purple-300", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "h-3 w-3 text-slate-400" }),
                          "跨接口引用: ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: sel.ref })
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => handleRemoveSelector(idx),
                          className: "text-slate-500 hover:text-rose-400 p-1 rounded",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" })
                        }
                      )
                    ]
                  },
                  `${JSON.stringify(sel)}-${idx}`
                );
              })
            ] })
          ] })
        ] }),
        secondary: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex flex-col bg-slate-900/30 overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-950/70 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded text-[11px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setRightView("atoms"),
                  className: `flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${rightView === "atoms" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"}`,
                  title: "查看一阶命中原子",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3 w-3" }),
                    " 命中原子"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setRightView("graph"),
                  className: `flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${rightView === "graph" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"}`,
                  title: "查看以此 Lookup 为根的级联依赖拓扑图",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { className: "h-3 w-3" }),
                    " 白板拓扑"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setRightView("prompt"),
                  className: `flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${rightView === "prompt" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"}`,
                  title: "查看此接口传递依赖排序生成的切片 Prompt 文本",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { className: "h-3 w-3" }),
                    " 切片编译"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: evaluating ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-indigo-400 text-[11px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }),
              " 计算中..."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-slate-400", children: [
              "一阶命中: ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-emerald-400", children: matchedAtoms.length })
            ] }) })
          ] }),
          evalError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "m-3 mb-0 rounded bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300 flex items-center gap-1.5 shrink-0 font-sans", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-4 w-4 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: evalError })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-hidden", children: [
            rightView === "atoms" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full overflow-y-auto p-4 space-y-2.5", children: matchedAtoms.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-xs text-slate-600 font-mono py-12", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-8 w-8 text-slate-700 mb-2" }),
              "当前规则在组件库中未命中任何有效原子"
            ] }) : matchedAtoms.map((atom) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "rounded border border-slate-800 bg-slate-950/80 p-2.5 text-xs hover:border-indigo-500/50 transition-colors shadow-sm",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 truncate", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Badge,
                        {
                          variant: atom.type === "d1" ? "d1" : atom.type === "d2" ? "d2" : atom.type === "d3" ? "d3" : "kernel",
                          className: "text-[10px] uppercase font-bold px-1.5 py-0",
                          children: [
                            atom.type,
                            typeof atom.priority === "number" ? `-P${atom.priority}` : ""
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200 truncate", children: atom.id }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-500 truncate", children: [
                        "@",
                        atom.package || "全局"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          openTab({
                            id: `atom:${atom.id}`,
                            type: "atom",
                            title: atom.id,
                            closable: true,
                            atomId: atom.id
                          });
                        },
                        className: "flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-slate-800 px-2 py-0.5 rounded transition-colors shrink-0",
                        title: "在新 Tab 中打开编辑该原子",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3" }),
                          " 打开编辑"
                        ]
                      }
                    )
                  ] }),
                  atom.domain && atom.domain.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1 mb-1.5", children: atom.domain.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      className: "text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded",
                      children: [
                        "#",
                        d
                      ]
                    },
                    d
                  )) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-slate-400 line-clamp-2 bg-slate-900/60 p-1.5 rounded font-sans leading-relaxed", children: atom.preview || "（原子内容为空）" })
                ]
              },
              atom.id
            )) }),
            rightView === "graph" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full w-full bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TopologyGraph,
              {
                lookupAdhoc: {
                  key: fullLookupKey,
                  selectors,
                  package: pkgName,
                  pillar
                },
                onSelectAtom: (atomId) => {
                  openTab({
                    id: `atom:${atomId}`,
                    type: "atom",
                    title: atomId,
                    closable: true,
                    atomId
                  });
                },
                onSelectLookup: (lookupKey2) => {
                  openTab({
                    id: `lookup:${lookupKey2}`,
                    type: "lookup",
                    title: lookupKey2.split("::").pop() || lookupKey2,
                    closable: true,
                    lookupKey: lookupKey2
                  });
                }
              }
            ) }),
            rightView === "prompt" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full p-3 bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              PromptViewer,
              {
                value: slicePrompt,
                chunks: sliceChunks,
                profile: sliceProfile,
                onSelectAtom: (atomId) => {
                  openTab({
                    id: `atom:${atomId}`,
                    type: "atom",
                    title: atomId,
                    closable: true,
                    atomId
                  });
                },
                onOpenLookup: (lookupKey2) => {
                  openTab({
                    id: `lookup:${lookupKey2}`,
                    type: "lookup",
                    title: lookupKey2.split("::").pop() || lookupKey2,
                    closable: true,
                    lookupKey: lookupKey2
                  });
                },
                onReload: () => runLiveDebug()
              }
            ) })
          ] })
        ] })
      }
    ) })
  ] });
}
function ManifestEditorTab({
  manifestName,
  workspacePath,
  packages,
  onSaved
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);
  const saveSnapshot = useIdeStore((state) => state.saveSnapshot);
  const getSnapshot = useIdeStore((state) => state.getSnapshot);
  const clearSnapshot = useIdeStore((state) => state.clearSnapshot);
  const preferences = useIdeStore((state) => state.preferences);
  const [rightView, setRightView] = reactExports.useState(
    (preferences == null ? void 0 : preferences.defaultRightPanel) === "prompt" ? "prompt" : "graph"
  );
  const [showRightPanel, setShowRightPanel] = reactExports.useState(true);
  const [manifestIdentifier, setManifestIdentifier] = reactExports.useState(manifestName);
  const [isReady, setIsReady] = reactExports.useState(false);
  const [name, setName] = reactExports.useState(
    manifestName ? manifestName.split("/").pop() || manifestName : "new_agent"
  );
  const [version, setVersion] = reactExports.useState("1.0.0");
  const [description, setDescription] = reactExports.useState("");
  const [items, setItems] = reactExports.useState([]);
  const [overrides, setOverrides] = reactExports.useState({});
  const [isModified, setIsModified] = reactExports.useState(false);
  const [initialSnapshot, setInitialSnapshot] = reactExports.useState(null);
  const [selectedLookup, setSelectedLookup] = reactExports.useState("");
  const [lookupFilterQuery, setLookupFilterQuery] = reactExports.useState("");
  const [editingOverrideKey, setEditingOverrideKey] = reactExports.useState(null);
  const [overrideQueryId, setOverrideQueryId] = reactExports.useState("");
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [saveStatus, setSaveStatus] = reactExports.useState("");
  const [prompt, setPrompt] = reactExports.useState("");
  const [hookedPrompt, setHookedPrompt] = reactExports.useState(null);
  const [chunks, setChunks] = reactExports.useState([]);
  const [profile, setProfile] = reactExports.useState(null);
  const [isHookActive, setIsHookActive] = reactExports.useState(false);
  const tabId = manifestIdentifier ? `manifest:${manifestIdentifier}` : "manifest:draft";
  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  };
  const availableExports = reactExports.useMemo(() => {
    const list = [];
    for (const pkg of packages) {
      for (const [key, def] of Object.entries(pkg.exports || {})) {
        const exportDef = def;
        list.push({
          key,
          pkg: pkg.name,
          pillar: exportDef.pillar || "d1",
          desc: exportDef.description || ""
        });
      }
    }
    return list;
  }, [packages]);
  reactExports.useEffect(() => {
    const snapshot = getSnapshot(tabId);
    if (snapshot) {
      setName(snapshot.name);
      setVersion(snapshot.version);
      setDescription(snapshot.description);
      setItems(snapshot.items);
      setOverrides(snapshot.overrides);
      if (snapshot.rightView) setRightView(snapshot.rightView);
      setShowRightPanel(snapshot.showRightPanel);
      setIsModified(snapshot.isModified);
      if (snapshot.initialSnapshot) {
        setInitialSnapshot(snapshot.initialSnapshot);
      }
      setTabDirty(tabId, snapshot.isModified);
      setIsReady(true);
      return;
    }
    if (!manifestName) {
      setIsReady(true);
      return;
    }
    fetch(`/api/manifests/${encodeURIComponent(manifestName)}`).then((res) => {
      if (!res.ok) throw new Error("加载清单失败");
      return res.json();
    }).then((data) => {
      const loadedName = data.name || manifestName;
      const loadedVersion = data.version || "1.0.0";
      const loadedDesc = data.description || "";
      const loadedOverrides = data.overrides || {};
      const rawImports = data.imports || [];
      const mappedItems = rawImports.filter((imp) => Boolean(imp.lookup)).map((imp) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        lookup: imp.lookup
      }));
      setName(loadedName);
      setVersion(loadedVersion);
      setDescription(loadedDesc);
      setOverrides(loadedOverrides);
      setItems(mappedItems);
      setIsModified(false);
      setTabDirty(tabId, false);
      setInitialSnapshot({
        name: loadedName,
        version: loadedVersion,
        description: loadedDesc,
        items: mappedItems,
        overrides: loadedOverrides
      });
      setIsReady(true);
    }).catch((err) => {
      console.error(err);
    });
  }, [manifestName, tabId, setTabDirty, getSnapshot]);
  reactExports.useEffect(() => {
    if (!isReady) return;
    saveSnapshot(tabId, {
      name,
      version,
      description,
      items,
      overrides,
      rightView,
      showRightPanel,
      isModified,
      initialSnapshot
    });
  }, [
    isReady,
    tabId,
    name,
    version,
    description,
    items,
    overrides,
    rightView,
    showRightPanel,
    isModified,
    initialSnapshot,
    saveSnapshot
  ]);
  const compileCurrent = reactExports.useCallback(
    (hookFlag = isHookActive) => {
      const targetQueryKey = manifestIdentifier || name;
      if (manifestIdentifier && !isModified) {
        fetch("/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manifest: targetQueryKey,
            is_file: false,
            apply_hook: hookFlag
          })
        }).then((res) => res.json()).then((data) => {
          if (data.prompt) setPrompt(data.prompt);
          setHookedPrompt(data.hooked_prompt || null);
          setChunks(data.chunks || []);
          if (data.profile) setProfile(data.profile);
        }).catch(console.error);
      } else if (items.length > 0) {
        fetch("/api/compile-adhoc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imports: items.map((item) => ({ lookup: item.lookup })),
            overrides: Object.keys(overrides).length > 0 ? overrides : void 0,
            apply_hook: hookFlag
          })
        }).then((res) => res.json()).then((data) => {
          if (data.prompt) setPrompt(data.prompt);
          setHookedPrompt(data.hooked_prompt || null);
          setChunks(data.chunks || []);
          if (data.profile) setProfile(data.profile);
        }).catch(console.error);
      }
    },
    [manifestIdentifier, name, isModified, items, overrides, isHookActive]
  );
  reactExports.useEffect(() => {
    const timer = setTimeout(() => {
      compileCurrent();
    }, 250);
    return () => clearTimeout(timer);
  }, [compileCurrent]);
  const handleAddLookup = () => {
    if (!selectedLookup) return;
    if (items.some((i) => i.lookup === selectedLookup)) return;
    const found = availableExports.find((e) => e.key === selectedLookup);
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      lookup: selectedLookup,
      pillar: found == null ? void 0 : found.pillar,
      description: found == null ? void 0 : found.desc
    };
    setItems([...items, newItem]);
    setSelectedLookup("");
    markDirty();
  };
  const handleRemoveLookup = (id) => {
    setItems(items.filter((i) => i.id !== id));
    markDirty();
  };
  const handleSaveManifest = async () => {
    if (!name.trim() || items.length === 0) return;
    setIsSaving(true);
    setSaveStatus("正在保存...");
    try {
      const payload = {
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        imports: items.map((i) => ({ lookup: i.lookup })),
        identifier: manifestIdentifier || name.trim(),
        workspace_path: workspacePath
      };
      if (Object.keys(overrides).length > 0) {
        payload.overrides = overrides;
      }
      const res = await fetch("/api/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("已保存");
        setIsModified(false);
        setTabDirty(tabId, false);
        if (!manifestIdentifier) {
          setManifestIdentifier(name.trim());
        }
        setInitialSnapshot({
          name: name.trim(),
          version: version.trim(),
          description: description.trim(),
          items: [...items],
          overrides: { ...overrides }
        });
        clearSnapshot(tabId);
        onSaved == null ? void 0 : onSaved();
        setTimeout(() => setSaveStatus(""), 2500);
      } else {
        setSaveStatus(`保存失败: ${data.detail}`);
      }
    } catch (_e) {
      setSaveStatus("保存请求异常");
    } finally {
      setIsSaving(false);
    }
  };
  const handleResetManifest = () => {
    if (!isModified) return;
    if (!window.confirm("确定要放弃所有未保存的修改并恢复吗？")) return;
    if (initialSnapshot) {
      setName(initialSnapshot.name);
      setVersion(initialSnapshot.version);
      setDescription(initialSnapshot.description);
      setItems([...initialSnapshot.items]);
      setOverrides({ ...initialSnapshot.overrides });
    } else {
      setName(manifestName ? manifestName.split("/").pop() || manifestName : "new_agent");
      setVersion("1.0.0");
      setDescription("");
      setItems([]);
      setOverrides({});
    }
    setIsModified(false);
    setTabDirty(tabId, false);
    clearSnapshot(tabId);
  };
  const handleOpenAtom = reactExports.useCallback(
    (atomId) => {
      openTab({
        id: `atom:${atomId}`,
        type: "atom",
        title: atomId,
        closable: true,
        atomId
      });
    },
    [openTab]
  );
  const handleOpenLookup = reactExports.useCallback(
    (lookupKey) => {
      openTab({
        id: `lookup:${lookupKey}`,
        type: "lookup",
        title: lookupKey.split("::").pop() || lookupKey,
        closable: true,
        lookupKey
      });
    },
    [openTab]
  );
  const renderBlueprintContent = (isFullWidth = false) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `h-full flex flex-col p-4 space-y-3 overflow-y-auto ${isFullWidth ? "max-w-4xl mx-auto w-full" : ""}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2 text-xs font-mono", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "manifest-name-input", className: "text-slate-400 block mb-1", children: "名称" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "manifest-name-input",
                type: "text",
                value: name,
                onChange: (e) => {
                  setName(e.target.value);
                  markDirty();
                },
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "manifest-version-input", className: "text-slate-400 block mb-1", children: "版本" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "manifest-version-input",
                type: "text",
                value: version,
                onChange: (e) => {
                  setVersion(e.target.value);
                  markDirty();
                },
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "manifest-desc-input", className: "text-slate-400 block mb-1", children: "描述说明" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "manifest-desc-input",
                type: "text",
                value: description,
                onChange: (e) => {
                  setDescription(e.target.value);
                  markDirty();
                },
                className: "w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { className: "h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: lookupFilterQuery,
                onChange: (e) => setLookupFilterQuery(e.target.value),
                placeholder: "过滤可用公开接口 (按包名或键名搜索)...",
                className: "w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: selectedLookup,
                onChange: (e) => setSelectedLookup(e.target.value),
                className: "flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "-- 选择要注入的公开查找接口 --" }),
                  availableExports.filter(
                    (exp) => !lookupFilterQuery.trim() || exp.key.toLowerCase().includes(lookupFilterQuery.trim().toLowerCase()) || exp.pkg.toLowerCase().includes(lookupFilterQuery.trim().toLowerCase())
                  ).map((exp) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: exp.key, children: [
                    "[",
                    exp.pkg,
                    "] ",
                    exp.key,
                    " (",
                    exp.pillar.toUpperCase(),
                    ")"
                  ] }, exp.key))
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                onClick: handleAddLookup,
                disabled: !selectedLookup,
                className: "h-7 text-xs flex items-center gap-1 shrink-0",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
                  " 注入蓝图"
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 rounded-lg border border-slate-800 bg-slate-900/20 p-3 space-y-3 overflow-y-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs font-mono text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "已注入组件清单 (",
              items.length,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: "按基质架构语义分组渲染（序列化顺序由编译内核自动确定）" })
          ] }),
          items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center text-xs text-slate-600 font-mono py-12", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-8 w-8 text-slate-700 mb-2" }),
            "尚未添加任何 Lookup 接口。"
          ] }) : [
            { title: "D3 控制基质 (Directives)", key: "d3", variant: "d3" },
            { title: "D2 程序基质 (Skills & ISA)", key: "d2", variant: "d2" },
            { title: "D1 陈述基质 (Knowledge & Memory)", key: "d1", variant: "d1" },
            { title: "其它接口 / 未识别基质", key: "other", variant: "outline" }
          ].map((group) => {
            const groupItems = items.filter((item) => {
              const p = (item.pillar || (item.lookup.includes("::") ? item.lookup.split("::")[1].slice(0, 2) : item.lookup.slice(0, 2))).toLowerCase();
              if (group.key === "other") {
                return p !== "d1" && p !== "d2" && p !== "d3";
              }
              return p === group.key;
            });
            if (groupItems.length === 0) return null;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] font-semibold text-slate-400 flex items-center gap-2 pt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: group.variant, className: "text-[9px] px-1 py-0 uppercase", children: group.key }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: group.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-600 text-[10px]", children: [
                  "(",
                  groupItems.length,
                  ")"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-1", children: groupItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded border border-slate-800 bg-slate-950/80 p-2 text-xs font-mono", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 truncate", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => handleOpenLookup(item.lookup),
                      className: "text-slate-100 font-semibold hover:text-indigo-300 hover:underline transition-colors text-left truncate flex items-center gap-1.5 group cursor-pointer",
                      title: `点击编辑接口契约: ${item.lookup}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: item.lookup }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3 opacity-0 group-hover:opacity-100 text-indigo-400 shrink-0 transition-opacity" })
                      ]
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                    overrides[item.lookup] && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "d3", className: "text-[9px] px-1 py-0", children: "已覆写" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          var _a, _b, _c;
                          if (editingOverrideKey === item.lookup) {
                            setEditingOverrideKey(null);
                          } else {
                            setEditingOverrideKey(item.lookup);
                            const currentOverride = overrides[item.lookup];
                            const targetId = (_c = (_b = (_a = currentOverride == null ? void 0 : currentOverride.selectors) == null ? void 0 : _a[0]) == null ? void 0 : _b.query) == null ? void 0 : _c.id;
                            setOverrideQueryId(typeof targetId === "string" ? targetId : "");
                          }
                        },
                        className: `p-1 rounded ${editingOverrideKey === item.lookup ? "text-indigo-400 bg-indigo-950" : "text-slate-400 hover:text-white"}`,
                        title: "配置 Overrides 覆写",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { className: "h-3 w-3" })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleRemoveLookup(item.id),
                        className: "p-1 text-slate-500 hover:text-rose-400",
                        title: "移除该接口",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" })
                      }
                    )
                  ] })
                ] }),
                editingOverrideKey === item.lookup && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded border border-indigo-800/60 bg-indigo-950/30 p-2 text-xs font-mono space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-indigo-300 font-semibold text-[11px]", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      "覆写选择器: ",
                      item.lookup
                    ] }),
                    overrides[item.lookup] && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          const nextOverrides = { ...overrides };
                          delete nextOverrides[item.lookup];
                          setOverrides(nextOverrides);
                          markDirty();
                        },
                        className: "text-[10px] text-amber-400 hover:underline flex items-center gap-1",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "h-3 w-3" }),
                          " 重置"
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "text",
                        value: overrideQueryId,
                        onChange: (e) => setOverrideQueryId(e.target.value),
                        placeholder: "目标特定原子 ID，如 d1-custom",
                        className: "flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        size: "sm",
                        onClick: () => {
                          if (overrideQueryId.trim()) {
                            setOverrides({
                              ...overrides,
                              [item.lookup]: {
                                selectors: [{ query: { id: overrideQueryId.trim() } }]
                              }
                            });
                            setEditingOverrideKey(null);
                            markDirty();
                          }
                        },
                        disabled: !overrideQueryId.trim(),
                        className: "h-7 text-xs",
                        children: "应用"
                      }
                    )
                  ] })
                ] })
              ] }, item.id)) })
            ] }, group.key);
          })
        ] })
      ]
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-mono text-xs shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200", children: name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [
            "v",
            version
          ] })
        ] }),
        !showRightPanel && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowRightPanel(true),
            className: "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer",
            title: "展开白板拓扑 / 编译产物伴生栏",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3 w-3 text-indigo-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "展开伴生栏" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        saveStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-indigo-400 font-mono", children: saveStatus }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleResetManifest,
            disabled: !isModified || isSaving,
            className: "h-7 text-xs flex items-center gap-1 px-2 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30",
            title: "放弃未保存的修改并重置",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "重置" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: handleSaveManifest,
            disabled: isSaving || !isModified,
            className: "h-7 text-xs flex items-center gap-1 px-2.5",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3 w-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "保存清单" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden", children: showRightPanel ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      SplitPane,
      {
        direction: "horizontal",
        initialRatio: 0.52,
        minPrimarySize: 380,
        minSecondarySize: 320,
        primary: renderBlueprintContent(false),
        secondary: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex flex-col bg-slate-900/30 overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3.5 py-1.5 border-b border-slate-800 bg-slate-950/70 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded bg-slate-950 border border-slate-800 p-0.5 text-[11px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setRightView("graph"),
                  className: `flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${rightView === "graph" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"}`,
                  title: "在右侧观察依赖拓扑 DAG 变化",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { className: "h-3 w-3" }),
                    " 白板拓扑"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setRightView("prompt"),
                  className: `flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${rightView === "prompt" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"}`,
                  title: "在右侧查看拼接好的完整 Prompt 文本与词元",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { className: "h-3 w-3" }),
                    " 实时编译"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setShowRightPanel(false),
                className: "p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer",
                title: "折叠伴生栏",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-3.5 w-3.5" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden", children: rightView === "graph" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full w-full bg-slate-950 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TopologyGraph,
            {
              manifest: manifestIdentifier || name,
              imports: items.map((i) => ({ lookup: i.lookup })),
              overrides,
              onSelectAtom: handleOpenAtom,
              onSelectLookup: handleOpenLookup
            }
          ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full p-3 bg-slate-950 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            PromptViewer,
            {
              value: prompt,
              hookedValue: hookedPrompt,
              chunks,
              profile,
              onSelectAtom: handleOpenAtom,
              onOpenLookup: handleOpenLookup,
              onReload: () => compileCurrent(),
              isHookActive,
              onToggleHook: (active) => setIsHookActive(active)
            }
          ) }) })
        ] })
      }
    ) : renderBlueprintContent(true) })
  ] });
}
function EmptyTab({
  manifestsCount,
  packagesCount,
  onOpenCommandPalette,
  onCreateManifest,
  onCreateAtom
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full w-full flex-col items-center justify-center p-6 text-slate-200 select-none overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md w-full space-y-6 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 mb-2 shadow-lg shadow-indigo-950/40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-8 w-8" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold font-sans tracking-wide text-slate-100", children: "ACA Studio 工作台" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 font-mono leading-relaxed", children: "公理化组件架构（ACA）可视化装配与开发控制台" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 pt-2 text-left font-mono", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onCreateManifest,
          className: "flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-indigo-950/40 hover:border-indigo-500/50 transition-all text-xs group cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-indigo-400 font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlus2, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "新建蓝图" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-slate-500 font-sans", children: "创建新的智能体装配清单 (Manifest)" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onCreateAtom,
          className: "flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-emerald-950/40 hover:border-emerald-500/50 transition-all text-xs group cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-emerald-400 font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "新建原子" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-slate-500 font-sans", children: "向组件包追加 D1 / D2 / D3 规范" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        variant: "outline",
        onClick: onOpenCommandPalette,
        className: "w-full flex items-center justify-between px-3.5 py-2 text-xs font-mono border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-300",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-3.5 w-3.5 text-indigo-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "跳转到清单、原子或接口..." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800", children: "Ctrl + P" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3.5 w-3.5 text-indigo-400" }),
          manifestsCount,
          " 个清单"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "h-3.5 w-3.5 text-purple-400" }),
          packagesCount,
          " 个组件包"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center gap-1 text-slate-400",
          title: "点击在当前标签页打开，按住 Ctrl 点击将在新标签页中打开",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointerClick, { className: "h-3.5 w-3.5 text-indigo-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "按住 Ctrl 点击可新建标签页" })
          ]
        }
      )
    ] })
  ] }) });
}
const useConfigStore = create((set) => ({
  config: null,
  loading: false,
  fetchConfig: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/system/config");
      const data = await res.json();
      set({ config: data });
    } catch (err) {
      console.error("获取系统配置失败", err);
    } finally {
      set({ loading: false });
    }
  },
  updateConfig: async (newConfig) => {
    const res = await fetch("/api/system/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig)
    });
    if (res.ok) {
      set((state) => ({
        config: state.config ? { ...state.config, ...newConfig } : newConfig
      }));
    } else {
      throw new Error("更新配置失败");
    }
  }
}));
function SettingsTab() {
  const { config, fetchConfig, updateConfig } = useConfigStore();
  const { preferences, updatePreferences } = useIdeStore();
  const [libPaths, setLibPaths] = reactExports.useState("");
  const [manPaths, setManPaths] = reactExports.useState("");
  const [hookCommand, setHookCommand] = reactExports.useState("");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);
  reactExports.useEffect(() => {
    var _a, _b;
    if (config) {
      setLibPaths(((_a = config.library_paths) == null ? void 0 : _a.join("\n")) || "");
      setManPaths(((_b = config.manifest_paths) == null ? void 0 : _b.join("\n")) || "");
      setHookCommand(config.post_process_hook || "");
    }
  }, [config]);
  const handleSaveConfig = async () => {
    setSaving(true);
    const newLibPaths = libPaths.split("\n").map((p) => p.trim()).filter(Boolean);
    const newManPaths = manPaths.split("\n").map((p) => p.trim()).filter(Boolean);
    try {
      await updateConfig({
        library_paths: newLibPaths,
        manifest_paths: newManPaths,
        post_process_hook: hookCommand.trim() || void 0
      });
      alert("系统配置已保存！可能会触发工作空间重载。");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col bg-slate-950 text-slate-100 overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-5 w-5 text-indigo-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "系统设置" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: handleSaveConfig, disabled: saving, className: "h-8 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4 w-4 mr-1.5" }),
        " 保存配置"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl p-6 space-y-8 font-sans", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { className: "h-4 w-4" }),
          " IDE 偏好设置"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "蓝图编辑器默认伴生视图" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-slate-500 mt-1", children: "选择打开 Manifest 或 Lookup 编辑器时，右侧默认展开的视图。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: preferences.defaultRightPanel,
              onChange: (e) => updatePreferences({ defaultRightPanel: e.target.value }),
              className: "bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "graph", children: "依赖白板拓扑 (Graph)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prompt", children: "实时切片编译 (Prompt)" })
              ]
            }
          )
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderTree, { className: "h-4 w-4" }),
          " 多工作区配置 (config.yaml)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-6 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "label",
              {
                htmlFor: "settings-lib-paths",
                className: "font-medium block mb-1 flex items-center gap-2",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4 text-indigo-400" }),
                  " 知识库挂载点 (Library Paths)"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-slate-500 mb-2", children: "每一行填写一个绝对路径，首个路径将作为默认新建组件包的目标位置。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                id: "settings-lib-paths",
                value: libPaths,
                onChange: (e) => setLibPaths(e.target.value),
                rows: 3,
                className: "w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-indigo-500",
                placeholder: "/home/user/workspace/aca_library"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "label",
              {
                htmlFor: "settings-man-paths",
                className: "font-medium block mb-1 flex items-center gap-2",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4 text-emerald-400" }),
                  " 清单蓝图存放点 (Manifest Paths)"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-slate-500 mb-2", children: "每一行填写一个绝对路径，定义了系统中智能体组装图谱的存放位置。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                id: "settings-man-paths",
                value: manPaths,
                onChange: (e) => setManPaths(e.target.value),
                rows: 3,
                className: "w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-emerald-500",
                placeholder: "/home/user/workspace/manifests"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "label",
              {
                htmlFor: "settings-hook-command",
                className: "font-medium block mb-1 flex items-center gap-2",
                children: "后处理钩子 (Post-Process Hook)"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-slate-500 mb-2", children: "一段将被管道调用的 Shell 命令，编译生成的 Prompt 会通过 STDIN 传入。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "settings-hook-command",
                type: "text",
                value: hookCommand,
                onChange: (e) => setHookCommand(e.target.value),
                className: "w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-purple-500",
                placeholder: "例如: pbcopy 或者 cat"
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}
const TabPane = reactExports.memo(
  function TabPane2({
    tab,
    isActive,
    packages,
    manifestsCount,
    onSaved,
    onDeleted,
    onOpenCommandPalette,
    onCreateManifest,
    onCreateAtom
  }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `h-full w-full ${isActive ? "block" : "hidden"}`, children: [
      tab.type === "empty" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        EmptyTab,
        {
          manifestsCount,
          packagesCount: packages.length,
          onOpenCommandPalette,
          onCreateManifest,
          onCreateAtom
        }
      ),
      tab.type === "atom" && tab.atomId && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AtomEditorTab,
        {
          atomId: tab.atomId,
          packages,
          onSaved,
          onDeleted: () => onDeleted(tab.id)
        },
        tab.atomId
      ),
      tab.type === "manifest" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ManifestEditorTab,
        {
          manifestName: tab.manifestName || "",
          workspacePath: tab.workspacePath,
          packages,
          onSaved
        },
        tab.id
      ),
      tab.type === "lookup" && tab.lookupKey && /* @__PURE__ */ jsxRuntimeExports.jsx(
        LookupEditorTab,
        {
          lookupKey: tab.lookupKey,
          packages,
          onSaved,
          onDeleted: () => onDeleted(tab.id)
        },
        tab.id
      ),
      tab.type === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsTab, {})
    ] });
  },
  (prev, next) => {
    return prev.isActive === next.isActive && prev.tab.id === next.tab.id && prev.tab.isDirty === next.tab.isDirty && prev.tab.title === next.tab.title && prev.packages === next.packages && prev.manifestsCount === next.manifestsCount && prev.onSaved === next.onSaved;
  }
);
function Modal({
  isOpen,
  onClose,
  title,
  children
}) {
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-slate-950/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-100", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "text-slate-500 hover:text-slate-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children })
  ] }) });
}
function CreateManifestModal({
  isOpen,
  onClose,
  newManName,
  setNewManName,
  newManWs,
  setNewManWs,
  manifestPaths,
  onSubmit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Modal, { isOpen, onClose, title: "新建蓝图草稿", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "modal-man-name", className: "block text-xs font-mono text-slate-400 mb-1", children: "蓝图名称 (可选带目录层级)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "modal-man-name",
          type: "text",
          value: newManName,
          onChange: (e) => setNewManName(e.target.value),
          className: "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500",
          placeholder: "例如: project_a/main_agent"
        }
      )
    ] }),
    manifestPaths && manifestPaths.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "modal-man-ws", className: "block text-xs font-mono text-slate-400 mb-1", children: "选择工作区 (Workspace)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          id: "modal-man-ws",
          value: newManWs,
          onChange: (e) => setNewManWs(e.target.value),
          className: "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500",
          children: manifestPaths.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p, children: p }, p))
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex justify-end gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onSubmit, disabled: !newManName.trim(), children: "创建草稿" })
    ] })
  ] }) });
}
function CreatePackageModal({
  isOpen,
  onClose,
  newPkgName,
  setNewPkgName,
  newPkgWs,
  setNewPkgWs,
  libraryPaths,
  onSubmit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Modal, { isOpen, onClose, title: "新建组件包 (Package)", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "modal-pkg-name", className: "block text-xs font-mono text-slate-400 mb-1", children: "包名称 (需在全局范围内唯一)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "modal-pkg-name",
          type: "text",
          value: newPkgName,
          onChange: (e) => setNewPkgName(e.target.value),
          className: "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500",
          placeholder: "例如: core_agent"
        }
      )
    ] }),
    libraryPaths && libraryPaths.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "modal-pkg-ws", className: "block text-xs font-mono text-slate-400 mb-1", children: "选择工作区 (Workspace)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          id: "modal-pkg-ws",
          value: newPkgWs,
          onChange: (e) => setNewPkgWs(e.target.value),
          className: "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500",
          children: libraryPaths.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p, children: p }, p))
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex justify-end gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onSubmit, disabled: !newPkgName.trim(), children: "确定创建" })
    ] })
  ] }) });
}
function buildTree(items) {
  const root = {
    children: /* @__PURE__ */ new Map()
  };
  for (const item of items) {
    const p = typeof item === "string" ? item : item.name;
    const wsPath = typeof item === "string" ? "默认工作区" : item.workspace_path || item.workspace || "默认工作区";
    let wsNode = root.children.get(wsPath);
    if (!wsNode) {
      wsNode = {
        name: wsPath,
        path: wsPath,
        isFolder: true,
        children: /* @__PURE__ */ new Map()
      };
      root.children.set(wsPath, wsNode);
    }
    const parts = p.split("/").filter(Boolean);
    let curr = wsNode;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const subPath = `${wsPath}::${parts.slice(0, i + 1).join("/")}`;
      let nextNode = curr.children.get(part);
      if (!nextNode) {
        nextNode = {
          name: part,
          path: isLeaf ? p : subPath,
          isFolder: !isLeaf,
          children: /* @__PURE__ */ new Map()
        };
        curr.children.set(part, nextNode);
      } else if (!isLeaf) {
        nextNode.isFolder = true;
      }
      curr = nextNode;
    }
  }
  function toSortedNodes(node) {
    const list = [];
    for (const child of node.children.values()) {
      list.push({
        name: child.name,
        path: child.path,
        isFolder: child.isFolder,
        children: toSortedNodes(child)
      });
    }
    return list.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  }
  return toSortedNodes(root);
}
function ManifestTreeItem({
  node,
  depth,
  activeManifestName,
  onToggleFolder,
  isExpanded,
  onSelectManifest,
  onDeleteManifest
}) {
  const isActive = !node.isFolder && activeManifestName === node.path;
  const paddingLeft = `${depth * 14 + 6}px`;
  if (node.isFolder) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5 mb-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onToggleFolder(node.path),
          style: { paddingLeft },
          className: "w-full flex items-center gap-1.5 py-1 pr-2 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors group cursor-pointer text-left",
          title: node.name,
          children: [
            isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3.5 w-3.5 text-slate-500 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-500 shrink-0" }),
            isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-3.5 w-3.5 text-indigo-400 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Folder, { className: "h-3.5 w-3.5 text-indigo-400 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold truncate text-[11px] text-slate-300", title: node.name, children: node.name })
          ]
        }
      ),
      isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5 border-l border-slate-800/60 ml-3 pl-1", children: node.children.map((child) => {
        const childExpanded = useIdeStore.getState().explorerExpanded[child.path] === true;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          ManifestTreeItem,
          {
            node: child,
            depth: depth + 1,
            activeManifestName,
            isExpanded: childExpanded,
            onToggleFolder,
            onSelectManifest,
            onDeleteManifest
          },
          child.path
        );
      }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: { paddingLeft },
      className: `group w-full flex items-center justify-between py-1 pr-1.5 rounded text-xs font-mono transition-colors ${isActive ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/50" : "text-slate-300 hover:bg-slate-800/60"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: (e) => onSelectManifest(node.path, e),
            className: "flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-white cursor-pointer",
            title: node.path,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3.5 w-3.5 text-indigo-400/80 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: node.name })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: (e) => onDeleteManifest(node.path, e),
            className: "opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 rounded shrink-0 cursor-pointer ml-1",
            title: "删除清单",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" })
          }
        )
      ]
    }
  );
}
function ManifestExplorer({
  manifests,
  activeManifestName,
  onSelectManifest,
  onDeleteManifest
}) {
  const explorerExpanded = useIdeStore((state) => state.explorerExpanded);
  const toggleExplorerExpanded = useIdeStore((state) => state.toggleExplorerExpanded);
  const tree = reactExports.useMemo(() => buildTree(manifests), [manifests]);
  if (manifests.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-6 text-center text-xs font-mono text-slate-500", children: "暂无清单蓝图" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: tree.map((node) => {
    const isExpanded = explorerExpanded[node.path] === true;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ManifestTreeItem,
      {
        node,
        depth: 0,
        activeManifestName,
        isExpanded,
        onToggleFolder: toggleExplorerExpanded,
        onSelectManifest,
        onDeleteManifest
      },
      node.path
    );
  }) });
}
function PackageExplorer({
  packages,
  onSelectAtom,
  onOpenLookup,
  onDeletePackage,
  onDeleteLookup,
  onDeleteAtom
}) {
  const explorerExpanded = useIdeStore((state) => state.explorerExpanded);
  const toggleExplorerExpanded = useIdeStore((state) => state.toggleExplorerExpanded);
  const workspaceGroups = reactExports.useMemo(() => {
    var _a;
    const map = /* @__PURE__ */ new Map();
    for (const pkg of packages) {
      const wsPath = pkg.workspace_path || pkg.workspace || "默认工作区";
      if (!map.has(wsPath)) {
        map.set(wsPath, []);
      }
      (_a = map.get(wsPath)) == null ? void 0 : _a.push(pkg);
    }
    return Array.from(map.entries()).map(([path, pkgs]) => ({
      path,
      name: path.split("/").pop() || path,
      packages: pkgs
    }));
  }, [packages]);
  if (packages.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-6 text-center text-xs font-mono text-slate-500", children: "暂无组件包" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: workspaceGroups.map((group) => {
    const isFolderExp = explorerExpanded[group.path] === true;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => toggleExplorerExpanded(group.path),
          className: "w-full flex items-center gap-1.5 py-1 px-1 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors group cursor-pointer text-left",
          title: group.path,
          children: [
            isFolderExp ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3.5 w-3.5 text-slate-500 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-500 shrink-0" }),
            isFolderExp ? /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-3.5 w-3.5 text-indigo-400 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Folder, { className: "h-3.5 w-3.5 text-indigo-400 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "font-semibold truncate text-[11px] text-slate-300",
                title: group.path,
                children: group.path
              }
            )
          ]
        }
      ),
      isFolderExp && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pl-3 space-y-1 border-l border-slate-800/60 ml-2", children: group.packages.map((pkg) => {
        var _a;
        const pkgKey = `pkg:${pkg.name}`;
        const isExp = explorerExpanded[pkgKey] === true;
        const exportsCount = Object.keys(pkg.exports || {}).length;
        const internalCount = Object.keys(pkg.internal_lookups || {}).length;
        const atomsCount = ((_a = pkg.atoms) == null ? void 0 : _a.length) || 0;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "rounded border border-slate-800/60 bg-slate-900/30 overflow-hidden",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-800/40 text-xs font-mono transition-colors group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleExplorerExpanded(pkgKey),
                    className: "flex items-center gap-2 flex-1 text-left cursor-pointer truncate",
                    children: [
                      isExp ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3.5 w-3.5 text-slate-400 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-400 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "h-3.5 w-3.5 text-indigo-400 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200 truncate", children: pkg.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-500 ml-auto shrink-0", children: [
                        "(",
                        atomsCount,
                        ")"
                      ] })
                    ]
                  }
                ),
                onDeletePackage && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: (e) => onDeletePackage(pkg.name, e),
                    className: "opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded cursor-pointer shrink-0 ml-1",
                    title: `删除组件包 ${pkg.name}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" })
                  }
                )
              ] }),
              isExp && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 pb-2.5 pt-1 space-y-2 border-t border-slate-800/40 bg-slate-950/40", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-emerald-400 flex items-center justify-between mb-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-3 w-3" }),
                      " 公开导出接口"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => onOpenLookup == null ? void 0 : onOpenLookup(`draft:${pkg.name}`),
                        className: "text-slate-400 hover:text-emerald-400 p-0.5 rounded cursor-pointer",
                        title: "新建公开导出接口",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3 w-3" })
                      }
                    )
                  ] }),
                  exportsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-2", children: Object.entries(pkg.exports).map(([k, def]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "w-full text-left text-xs font-mono text-slate-300 hover:text-emerald-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors group cursor-pointer",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            onClick: (e) => onOpenLookup == null ? void 0 : onOpenLookup(k, e),
                            className: "flex-1 text-left truncate flex items-center gap-1 cursor-pointer",
                            title: "点击打开",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: k }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[9px] px-1 py-0", children: def.pillar })
                            ]
                          }
                        ),
                        onDeleteLookup && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            onClick: (e) => onDeleteLookup(k, e),
                            className: "opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-opacity",
                            title: "删除此公开接口",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" })
                          }
                        )
                      ]
                    },
                    k
                  )) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-slate-400 flex items-center justify-between mb-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3 w-3" }),
                      " 内部私有查找"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: (e) => onOpenLookup == null ? void 0 : onOpenLookup(`draft:${pkg.name}`, e),
                        className: "text-slate-400 hover:text-indigo-400 p-0.5 rounded cursor-pointer",
                        title: "新建内部查找",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3 w-3" })
                      }
                    )
                  ] }),
                  internalCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-2", children: Object.entries(pkg.internal_lookups).map(([k, def]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors group cursor-pointer",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            onClick: (e) => onOpenLookup == null ? void 0 : onOpenLookup(k, e),
                            className: "flex-1 text-left truncate flex items-center gap-1 cursor-pointer",
                            title: "点击打开",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: k }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-slate-600", children: def.pillar })
                            ]
                          }
                        ),
                        onDeleteLookup && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            onClick: (e) => onDeleteLookup(k, e),
                            className: "opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-opacity",
                            title: "删除此内部查找",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" })
                          }
                        )
                      ]
                    },
                    k
                  )) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-semibold text-slate-400 flex items-center justify-between mb-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "h-3 w-3" }),
                      " 包含原子清单"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: (e) => {
                          e.stopPropagation();
                          onSelectAtom == null ? void 0 : onSelectAtom(`draft:${pkg.name}`, e);
                        },
                        className: "text-slate-400 hover:text-indigo-400 p-0.5 rounded transition-colors cursor-pointer",
                        title: "新建原子组件",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3 w-3" })
                      }
                    )
                  ] }),
                  atomsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 pl-2", children: pkg.atoms.map((atom) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded px-1.5 py-1 truncate flex items-center justify-between transition-colors group cursor-pointer",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            onClick: (e) => onSelectAtom == null ? void 0 : onSelectAtom(atom.id, e),
                            className: "flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer",
                            title: "点击打开原子",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400 shrink-0" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: atom.id })
                            ]
                          }
                        ),
                        onDeleteAtom && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            onClick: (e) => onDeleteAtom(atom.id, e),
                            className: "opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-opacity",
                            title: "删除此原子组件",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" })
                          }
                        )
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
      }) })
    ] }, group.path);
  }) });
}
function App() {
  var _a, _b;
  const ideStore = useIdeStore();
  const configStore = useConfigStore();
  const [manifests, setManifests] = reactExports.useState([]);
  const [packages, setPackages] = reactExports.useState([]);
  const [status, setStatus] = reactExports.useState("检测中...");
  const [isCreatePkgOpen, setIsCreatePkgOpen] = reactExports.useState(false);
  const [newPkgName, setNewPkgName] = reactExports.useState("");
  const [newPkgWs, setNewPkgWs] = reactExports.useState("");
  const [isCreateManOpen, setIsCreateManOpen] = reactExports.useState(false);
  const [newManName, setNewManName] = reactExports.useState("");
  const [newManWs, setNewManWs] = reactExports.useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = reactExports.useState(false);
  const [lintLoading, setLintLoading] = reactExports.useState(false);
  const [lintErrors, setLintErrors] = reactExports.useState(0);
  const [lintWarnings, setLintWarnings] = reactExports.useState(0);
  const [lintIssues, setLintIssues] = reactExports.useState([]);
  const sidebarWidth = ideStore.sidebarWidth;
  const setSidebarWidth = ideStore.setSidebarWidth;
  const [isDraggingSidebar, setIsDraggingSidebar] = reactExports.useState(false);
  const handleSidebarPointerDown = (e) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  };
  const handleSidebarPointerMove = reactExports.useCallback(
    (e) => {
      if (!isDraggingSidebar) return;
      const newWidth = e.clientX - 48;
      if (newWidth >= 180 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    },
    [isDraggingSidebar, setSidebarWidth]
  );
  const handleSidebarPointerUp = reactExports.useCallback(() => {
    setIsDraggingSidebar(false);
  }, []);
  reactExports.useEffect(() => {
    if (isDraggingSidebar) {
      window.addEventListener("pointermove", handleSidebarPointerMove);
      window.addEventListener("pointerup", handleSidebarPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handleSidebarPointerMove);
      window.removeEventListener("pointerup", handleSidebarPointerUp);
    };
  }, [isDraggingSidebar, handleSidebarPointerMove, handleSidebarPointerUp]);
  const [explorerTab, setExplorerTab] = reactExports.useState("manifests");
  const fetchAssets = reactExports.useCallback(() => {
    fetch("/api/assets").then((res) => res.json()).then((data) => {
      setManifests(data.manifests || []);
      setPackages(data.packages || []);
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
  const { fetchConfig } = configStore;
  reactExports.useEffect(() => {
    fetchConfig();
    fetch("/api/health").then((res) => res.json()).then((data) => setStatus(data.status === "ok" ? "正常" : data.status)).catch(() => setStatus("离线"));
    fetchAssets();
    fetchLintReport();
    const eventSource = new EventSource("/api/events/stream");
    eventSource.addEventListener("change", () => {
      fetchAssets();
      fetchLintReport();
    });
    const handleGlobalKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (isMod && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleCreateEmptyTab();
      } else if (isMod && e.key === "[") {
        e.preventDefault();
        ideStore.goBack();
      } else if (isMod && e.key === "]") {
        e.preventDefault();
        ideStore.goForward();
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        ideStore.goBack();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        ideStore.goForward();
      }
    };
    const handleMouseUp = (e) => {
      if (e.button === 3) {
        e.preventDefault();
        ideStore.goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        ideStore.goForward();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      eventSource.close();
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [fetchConfig, fetchAssets, fetchLintReport, ideStore.goBack, ideStore.goForward]);
  const handleOpenManifestTab = (mName, e, opts) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isPreview = !newTab;
    ideStore.openTab(
      {
        id: `manifest:${mName}`,
        type: "manifest",
        title: mName,
        closable: true,
        manifestName: mName,
        isPreview
      },
      { newTab, isPreview }
    );
  };
  const handleOpenAtomTab = (atomId, e, opts) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isDraft = atomId.startsWith("draft:");
    const tabTitle = isDraft ? `新建原子 (${atomId.replace("draft:", "")})` : atomId;
    const isPreview = isDraft ? false : !newTab;
    ideStore.openTab(
      {
        id: `atom:${atomId}`,
        type: "atom",
        title: tabTitle,
        closable: true,
        atomId,
        isPreview
      },
      { newTab: isDraft ? true : newTab, isPreview }
    );
  };
  const handleOpenLookupTab = (lookupKey, e, opts) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isDraft = lookupKey.startsWith("draft:");
    const isPreview = isDraft ? false : !newTab;
    ideStore.openTab(
      {
        id: `lookup:${lookupKey}`,
        type: "lookup",
        title: lookupKey.split("::").pop() || lookupKey,
        closable: true,
        lookupKey,
        isPreview
      },
      { newTab: isDraft ? true : newTab, isPreview }
    );
  };
  const handleSafeCloseTab = (tab, e) => {
    if (e) e.stopPropagation();
    if (!tab.closable) return;
    if (tab.isDirty) {
      const confirmDiscard = window.confirm(
        `标签页「${tab.title}」存在尚未保存的更改。确定要放弃修改并关闭吗？`
      );
      if (!confirmDiscard) return;
    }
    ideStore.closeTab(tab.id);
  };
  const handleProblemClick = (issue) => {
    const text = `${issue.code} ${issue.message}`;
    const atomMatch = text.match(/\b(d[1-3]-[a-zA-Z0-9_-]+)\b/);
    if (atomMatch) {
      handleOpenAtomTab(atomMatch[1]);
      return;
    }
    const manifestMatch = text.match(/Manifest '([^']+)'/);
    if (manifestMatch) {
      handleOpenManifestTab(manifestMatch[1]);
      return;
    }
    const lookupMatch = text.match(/Lookup '([^']+)'/);
    if (lookupMatch) {
      const lKey = lookupMatch[1];
      handleOpenLookupTab(lKey);
    }
  };
  const handleCreateNewAtomDraft = () => {
    var _a2;
    const defaultPkg = ((_a2 = packages[0]) == null ? void 0 : _a2.name) || "";
    ideStore.openTab(
      {
        id: `atom:draft_${Date.now()}`,
        type: "atom",
        title: "新建原子草稿",
        closable: true,
        atomId: `draft:${defaultPkg}`
      },
      { newTab: true }
    );
  };
  const handleCreateNewManifest = () => {
    var _a2, _b2;
    setNewManName(`未命名蓝图_${Date.now().toString().slice(-4)}`);
    setNewManWs(((_b2 = (_a2 = configStore.config) == null ? void 0 : _a2.manifest_paths) == null ? void 0 : _b2[0]) || "");
    setIsCreateManOpen(true);
  };
  const submitCreateManifest = () => {
    if (!newManName.trim()) return;
    setIsCreateManOpen(false);
    ideStore.openTab(
      {
        id: `manifest:${newManName.trim()}`,
        type: "manifest",
        title: newManName.trim(),
        closable: true,
        manifestName: "",
        workspacePath: newManWs || void 0
      },
      { newTab: true }
    );
  };
  const handleCreateEmptyTab = () => {
    const newTabId = `empty_${Date.now()}`;
    ideStore.openTab(
      {
        id: newTabId,
        type: "empty",
        title: "新标签页",
        closable: true
      },
      { newTab: true }
    );
  };
  const handleDeleteManifest = async (mName, e) => {
    e.stopPropagation();
    if (!window.confirm(`确定要删除清单 "${mName}" 吗？此操作不可逆。`)) return;
    try {
      const res = await fetch(`/api/manifests/${encodeURIComponent(mName)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchAssets();
        ideStore.closeTab(`manifest:${mName}`);
      } else {
        const data = await res.json();
        alert(`删除失败: ${data.detail}`);
      }
    } catch (_err) {
      alert("删除清单网络请求异常");
    }
  };
  const handleTabSaved = reactExports.useCallback(() => {
    fetchAssets();
    fetchLintReport();
  }, [fetchAssets, fetchLintReport]);
  const handleTabDeleted = reactExports.useCallback(
    (tabId) => {
      ideStore.closeTab(tabId);
      fetchAssets();
      fetchLintReport();
    },
    [ideStore, fetchAssets, fetchLintReport]
  );
  const handleCreatePackage = reactExports.useCallback(() => {
    var _a2, _b2;
    setNewPkgName("");
    setNewPkgWs(((_b2 = (_a2 = configStore.config) == null ? void 0 : _a2.library_paths) == null ? void 0 : _b2[0]) || "");
    setIsCreatePkgOpen(true);
  }, [configStore.config]);
  const submitCreatePackage = reactExports.useCallback(() => {
    if (!newPkgName.trim()) return;
    setIsCreatePkgOpen(false);
    fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPkgName.trim(),
        workspace_path: newPkgWs || void 0
      })
    }).then(async (res) => {
      if (res.ok) {
        fetchAssets();
        fetchLintReport();
      } else {
        const data = await res.json();
        alert(`创建组件包失败: ${data.detail}`);
      }
    }).catch(() => alert("创建组件包网络异常"));
  }, [newPkgName, newPkgWs, fetchAssets, fetchLintReport]);
  const handleDeletePackage = reactExports.useCallback(
    (pkgName, e) => {
      e.stopPropagation();
      if (!window.confirm(`确定要彻底删除组件包 "${pkgName}" 及其所有文件吗？此操作不可逆。`))
        return;
      fetch(`/api/packages/${encodeURIComponent(pkgName)}`, {
        method: "DELETE"
      }).then(async (res) => {
        if (res.ok) {
          fetchAssets();
          fetchLintReport();
        } else {
          const data = await res.json();
          alert(`删除组件包失败: ${data.detail}`);
        }
      }).catch(() => alert("删除组件包网络异常"));
    },
    [fetchAssets, fetchLintReport]
  );
  const handleDeleteLookup = reactExports.useCallback(
    (lookupKey, e) => {
      e.stopPropagation();
      if (!window.confirm(`确定要删除查找接口 "${lookupKey}" 吗？`)) return;
      fetch(`/api/lookups/${encodeURIComponent(lookupKey)}`, {
        method: "DELETE"
      }).then(async (res) => {
        if (res.ok) {
          ideStore.closeTab(`lookup:${lookupKey}`);
          fetchAssets();
          fetchLintReport();
        } else {
          const data = await res.json();
          alert(`删除接口失败: ${data.detail}`);
        }
      }).catch(() => alert("删除接口网络异常"));
    },
    [ideStore, fetchAssets, fetchLintReport]
  );
  const handleDeleteAtom = reactExports.useCallback(
    (atomId, e) => {
      e.stopPropagation();
      if (!window.confirm(`确定要物理删除原子文件 "${atomId}" 吗？`)) return;
      fetch(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: "DELETE"
      }).then(async (res) => {
        if (res.ok) {
          ideStore.closeTab(`atom:${atomId}`);
          fetchAssets();
          fetchLintReport();
        } else {
          const data = await res.json();
          alert(`删除原子失败: ${data.detail}`);
        }
      }).catch(() => alert("删除原子网络异常"));
    },
    [ideStore, fetchAssets, fetchLintReport]
  );
  const activeTab = ideStore.tabs.find((t) => t.id === ideStore.activeTabId);
  const canGoBack = ideStore.historyIndex > 0;
  const canGoForward = ideStore.historyIndex < ideStore.navigationHistory.length - 1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-12 border-r border-slate-800 bg-slate-950 flex flex-col items-center py-3 space-y-4 shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              if (!ideStore.sidebarOpen) ideStore.setSidebarOpen(true);
              ideStore.setActiveSidebarView("explorer");
            },
            className: `p-2 rounded-lg transition-colors cursor-pointer ${ideStore.sidebarOpen && ideStore.activeSidebarView === "explorer" ? "text-indigo-400 bg-indigo-950/60 ring-1 ring-indigo-500/40" : "text-slate-400 hover:text-white"}`,
            title: "资源管理器",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderTree, { className: "h-5 w-5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              ideStore.openTab({
                id: "system:settings",
                type: "settings",
                title: "设置",
                closable: true
              });
            },
            className: `mt-auto p-2 rounded-lg transition-colors cursor-pointer ${ideStore.activeTabId === "system:settings" ? "text-indigo-400 bg-indigo-950/60 ring-1 ring-indigo-500/40" : "text-slate-400 hover:text-white"}`,
            title: "全局系统设置",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-5 w-5" })
          }
        )
      ] }),
      ideStore.sidebarOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "aside",
          {
            style: {
              width: `${sidebarWidth}px`,
              userSelect: isDraggingSidebar ? "none" : "auto"
            },
            className: "border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 border-b border-slate-800/80 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold font-mono tracking-wider text-slate-300", children: "资源视图" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: ideStore.toggleSidebar,
                    className: "text-slate-400 hover:text-white p-0.5 cursor-pointer",
                    title: "折叠侧边栏",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2 border-b border-slate-800/60 bg-slate-950/40", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded bg-slate-900 p-0.5 border border-slate-800 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => setExplorerTab("manifests"),
                      className: `flex-1 py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${explorerTab === "manifests" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3.5 w-3.5" }),
                        " 清单蓝图"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => setExplorerTab("packages"),
                      className: `flex-1 py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${explorerTab === "packages" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "h-3.5 w-3.5" }),
                        " 组件包"
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2", children: explorerTab === "manifests" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    variant: "outline",
                    size: "sm",
                    onClick: handleCreateNewManifest,
                    className: "w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7 cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlus2, { className: "h-3.5 w-3.5 text-indigo-400" }),
                      " 新建清单蓝图"
                    ]
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    variant: "outline",
                    size: "sm",
                    onClick: handleCreatePackage,
                    className: "w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7 cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5 text-indigo-400" }),
                      " 新建组件包"
                    ]
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-2 space-y-1", children: explorerTab === "manifests" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                ManifestExplorer,
                {
                  manifests,
                  activeManifestName: activeTab == null ? void 0 : activeTab.manifestName,
                  onSelectManifest: (m, e) => handleOpenManifestTab(m, e),
                  onDeleteManifest: (m, e) => handleDeleteManifest(m, e)
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                PackageExplorer,
                {
                  packages,
                  onSelectAtom: (atomId, e) => handleOpenAtomTab(atomId, e),
                  onOpenLookup: (lKey, e) => handleOpenLookupTab(lKey, e),
                  onDeletePackage: handleDeletePackage,
                  onDeleteLookup: handleDeleteLookup,
                  onDeleteAtom: handleDeleteAtom
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            onPointerDown: handleSidebarPointerDown,
            className: `relative z-20 shrink-0 group flex items-center justify-center w-1.5 cursor-col-resize hover:bg-indigo-500/60 transition-colors ${isDraggingSidebar ? "bg-indigo-500" : "bg-slate-800"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: `rounded-full bg-slate-600 group-hover:bg-white h-8 w-1 transition-colors ${isDraggingSidebar ? "!bg-white" : ""}`
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 flex flex-col overflow-hidden bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center border-b border-slate-800 bg-slate-900/60 overflow-x-auto shrink-0 scrollbar-none h-9", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 px-2 border-r border-slate-800 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: ideStore.goBack,
                disabled: !canGoBack,
                className: "p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer",
                title: "后退",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: ideStore.goForward,
                disabled: !canGoForward,
                className: "p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer",
                title: "前进",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3.5 w-3.5" })
              }
            )
          ] }),
          ideStore.tabs.map((tab) => {
            const isActive = tab.id === ideStore.activeTabId;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                onClick: () => ideStore.setActiveTab(tab.id),
                onDoubleClick: () => ideStore.pinTab(tab.id),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    ideStore.setActiveTab(tab.id);
                  }
                },
                onAuxClick: (e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    handleSafeCloseTab(tab, e);
                  }
                },
                className: `group flex items-center gap-2 px-3.5 py-2 border-r border-slate-800 cursor-pointer text-xs font-mono transition-colors shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 ${isActive ? "bg-slate-950 text-indigo-300 border-t-2 border-t-indigo-500 font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-t-2 border-t-transparent"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: `truncate max-w-[140px] ${tab.isPreview ? "italic text-slate-300/80" : ""}`,
                      children: tab.title
                    }
                  ),
                  tab.isDirty && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" }),
                  tab.closable && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e) => handleSafeCloseTab(tab, e),
                      className: "opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded cursor-pointer transition-opacity",
                      title: "关闭标签页",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
                    }
                  )
                ]
              },
              tab.id
            );
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: handleCreateEmptyTab,
              className: "flex items-center justify-center p-1.5 ml-1.5 mr-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors shrink-0 cursor-pointer",
              title: "新建标签页",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden relative", children: ideStore.tabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          TabPane,
          {
            tab,
            isActive: tab.id === ideStore.activeTabId,
            packages,
            manifestsCount: manifests.length,
            onSaved: handleTabSaved,
            onDeleted: handleTabDeleted,
            onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
            onCreateManifest: handleCreateNewManifest,
            onCreateAtom: handleCreateNewAtomDraft
          },
          tab.id
        )) }),
        ideStore.bottomPanelOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-56 border-t border-slate-800 bg-slate-900/95 flex flex-col shrink-0 font-mono text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-950 text-slate-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 font-bold text-indigo-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-3.5 w-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "问题与诊断 (",
                  lintIssues.length,
                  ")"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: fetchLintReport,
                  disabled: lintLoading,
                  className: "text-slate-400 hover:text-indigo-400 p-1 cursor-pointer",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `h-3 w-3 ${lintLoading ? "animate-spin" : ""}` })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: ideStore.toggleBottomPanel,
                className: "text-slate-400 hover:text-white p-1 cursor-pointer",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-3 space-y-1.5 select-text", children: lintIssues.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-emerald-400 py-4 justify-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "所有知识库、Lookup 接口与 Manifest 清单均严格合规" })
          ] }) : lintIssues.map((issue) => {
            const isErr = issue.level === "错误";
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => handleProblemClick(issue),
                className: `w-full text-left flex items-start justify-between p-2 rounded border cursor-pointer group transition-colors ${isErr ? "border-rose-900/50 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40" : "border-amber-900/50 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 flex-1", children: [
                    isErr ? /* @__PURE__ */ jsxRuntimeExports.jsx(OctagonAlert, { className: "h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-sans leading-relaxed flex-1", children: issue.message })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0 ml-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: issue.code }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" })
                  ] })
                ]
              },
              `${issue.level}-${issue.code}-${issue.message}`
            );
          }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "h-6 border-t border-slate-800 bg-slate-950 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 select-none z-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-slate-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-3.5 w-3.5 text-indigo-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200", children: "ACA Studio" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: `w-1.5 h-1.5 rounded-full ${status === "正常" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-rose-500"}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: status })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: ideStore.toggleBottomPanel,
            className: `flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${lintErrors > 0 ? "text-rose-400 hover:bg-rose-950/60 font-semibold" : lintWarnings > 0 ? "text-amber-400 hover:bg-amber-950/60" : "text-slate-400 hover:text-emerald-300"}`,
            children: [
              lintErrors > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-3 w-3 text-rose-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-3 w-3 text-emerald-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: lintErrors > 0 ? `${lintErrors} 错误` : lintWarnings > 0 ? `${lintWarnings} 警告` : "合规" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-500 hidden sm:inline", children: [
          manifests.length,
          " 清单 · ",
          packages.length,
          " 组件包"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600 hidden sm:inline", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setIsCommandPaletteOpen(true),
            className: "flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer",
            title: "打开命令面板 (Ctrl+P)",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-3 w-3 text-indigo-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px]", children: "Ctrl+P" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CommandPalette,
      {
        isOpen: isCommandPaletteOpen,
        onClose: () => setIsCommandPaletteOpen(false),
        manifests,
        packages
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreatePackageModal,
      {
        isOpen: isCreatePkgOpen,
        onClose: () => setIsCreatePkgOpen(false),
        newPkgName,
        setNewPkgName,
        newPkgWs,
        setNewPkgWs,
        libraryPaths: (_a = configStore.config) == null ? void 0 : _a.library_paths,
        onSubmit: submitCreatePackage
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateManifestModal,
      {
        isOpen: isCreateManOpen,
        onClose: () => setIsCreateManOpen(false),
        newManName,
        setNewManName,
        newManWs,
        setNewManWs,
        manifestPaths: (_b = configStore.config) == null ? void 0 : _b.manifest_paths,
        onSubmit: submitCreateManifest
      }
    )
  ] });
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
