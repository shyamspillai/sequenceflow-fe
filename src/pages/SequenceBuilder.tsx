import { useCallback, useMemo, useState } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useEdgesState, useNodesState, addEdge, type Node as FlowNode, type Edge, type Connection, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import InputTextNodeComponent from '../components/nodes/InputTextNode'
import type { InputTextNode, InputTextNodeData, InputFieldConfig } from '../types/workflow'
import NodeEditModal from '../components/nodes/NodeEditModal'

function BuilderCanvas() {
	const nodeTypes = useMemo(() => ({ inputText: InputTextNodeComponent }), [])
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<InputTextNodeData, 'inputText'>>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const { screenToFlowPosition } = useReactFlow()
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

	const openEditor = useCallback((nodeId: string) => setEditingNodeId(nodeId), [])

	const attachEditor = useCallback((n: FlowNode<InputTextNodeData, 'inputText'>): FlowNode<InputTextNodeData, 'inputText'> => ({
		...n,
		data: { ...n.data, openEditor }
	}), [openEditor])

	const onConnect = useCallback((connection: Connection) => {
		setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
	}, [setEdges])

	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		event.dataTransfer.dropEffect = 'move'
	}, [])

	const onDrop = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		const type = event.dataTransfer.getData('application/reactflow')
		if (type !== 'inputText') return
		const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
		const fields: InputFieldConfig[] = []
		const base: InputTextNode = {
			id: crypto.randomUUID(),
			type: 'inputText',
			name: 'Input Node',
			inputSchema: {},
			outputSchema: { },
			config: { fields },
			validationLogic: undefined,
			connections: [],
		}
		const node: FlowNode<InputTextNodeData, 'inputText'> = {
			id: base.id,
			type: 'inputText',
			position,
			data: { base, value: {}, errors: {}, openEditor },
		}
		setNodes((prev) => [...prev, node])
	}, [screenToFlowPosition, setNodes, openEditor])

	const editingNode = useMemo(() => nodes.find(n => n.id === editingNodeId) ?? null, [nodes, editingNodeId])

	return (
		<div className="flex gap-4">
			<aside className="w-64 shrink-0 border border-slate-200 rounded-lg bg-white p-3 h-[80vh]">
				<div className="text-sm font-medium text-slate-800 mb-3">Nodes</div>
				<div
					className="rounded-md border border-slate-200 p-3 bg-slate-50 cursor-move"
					draggable
					onDragStart={(event) => {
						event.dataTransfer.setData('application/reactflow', 'inputText')
						event.dataTransfer.effectAllowed = 'move'
					}}
				>
					<div className="text-xs font-medium text-slate-700">Input Node</div>
					<div className="text-[11px] text-slate-500">Multiple fields</div>
				</div>
			</aside>
			<div className="flex-1 min-w-0 h-[80vh] rounded-lg overflow-hidden border border-slate-200">
				<ReactFlow
					nodes={nodes.map(attachEditor)}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					nodeTypes={nodeTypes}
					onDrop={onDrop}
					onDragOver={onDragOver}
					fitView
				>
					<Background variant={BackgroundVariant.Dots} gap={18} size={1.5} color="#cbd5e1" />
					<MiniMap pannable zoomable nodeColor={() => '#0ea5e9'} nodeStrokeColor={() => '#0369a1'} maskColor="rgba(241,245,249,0.9)" />
					<Controls showInteractive={false} />
				</ReactFlow>
			</div>

			<NodeEditModal
				isOpen={Boolean(editingNode)}
				fields={editingNode?.data.base.config.fields ?? []}
				currentValues={editingNode?.data.value ?? {}}
				onClose={() => setEditingNodeId(null)}
				onSave={(updates) => {
					setNodes((prev) => prev.map(n => n.id === editingNodeId ? {
						...n,
						data: {
							...n.data,
							base: {
								...n.data.base,
								config: { ...n.data.base.config, fields: updates.fields },
							}
						}
					} : n))
					setEditingNodeId(null)
				}}
			/>
		</div>
	)
}

export default function SequenceBuilder() {
	return (
		<ReactFlowProvider>
			<BuilderCanvas />
		</ReactFlowProvider>
	)
} 