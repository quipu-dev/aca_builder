import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect } from 'react';
import '@xyflow/react/dist/style.css';
import { AtomNode, LookupNode, ManifestNode } from './CustomNodes';

const nodeTypes = {
  manifestNode: ManifestNode,
  lookupNode: LookupNode,
  atomNode: AtomNode,
};

function autoLayout(nodes: Node[], _edges: Edge[]): Node[] {
  const colX = { manifest: 50, lookup_l1: 340, atom_l1: 650, lookup_l2: 960, atom_l2: 1270 };
  const colCounts: Record<string, number> = {
    manifest: 0,
    lookup_l1: 0,
    atom_l1: 0,
    lookup_l2: 0,
    atom_l2: 0,
  };

  return nodes.map((node) => {
    let col = 'lookup_l1';
    if (node.type === 'manifestNode') {
      col = 'manifest';
    } else if (node.type === 'atomNode') {
      col = (node.data as { type?: string })?.type === 'kernel' ? 'manifest' : 'atom_l1';
    } else if (node.type === 'lookupNode') {
      col = 'lookup_l1';
    }

    const y = (colCounts[col] || 0) * 85 + 40;
    colCounts[col] = (colCounts[col] || 0) + 1;
    const x = colX[col as keyof typeof colX] || 400;

    return {
      ...node,
      position: { x, y },
    };
  });
}

export function TopologyGraph({ manifest }: { manifest: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!manifest) return;
    fetch(`/api/graph?manifest=${encodeURIComponent(manifest)}`)
      .then((res) => res.json())
      .then((data: { nodes: Node[]; edges: Edge[] }) => {
        const layoutedNodes = autoLayout(data.nodes || [], data.edges || []);
        setNodes(layoutedNodes);
        setEdges(data.edges || []);
      })
      .catch((err) => {
        console.error('获取拓扑数据失败:', err);
      });
  }, [manifest, setNodes, setEdges]);

  if (!manifest) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
        请在左侧选择清单以查看其依赖拓扑图
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls className="!bg-slate-900 !border-slate-800 text-slate-200" />
      </ReactFlow>
    </div>
  );
}
