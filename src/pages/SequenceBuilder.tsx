import { useCallback, useMemo, useState } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useEdgesState, useNodesState, addEdge, type Node as FlowNode, type Edge, type Connection, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import InputTextNodeComponent from '../components/nodes/InputTextNode'
import DecisionNodeComponent from '../components/nodes/DecisionNode'
import type { InputTextNode, InputTextNodeData, InputFieldConfig, DecisionNode, DecisionNodeData, DecisionCondition } from '../types/workflow'
import NodeEditModal from '../components/nodes/NodeEditModal'
import DecisionNodeEditModal from '../components/nodes/DecisionNodeEditModal'
import { inputFieldsToJsonSchema } from '../utils/schema'

function BuilderCanvas() {
	const nodeTypes = useMemo(() => ({ inputText: InputTextNodeComponent, decision: DecisionNodeComponent }), [])
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<any>>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const { screenToFlowPosition } = useReactFlow()
	const [editingInputNodeId, setEditingInputNodeId] = useState<string | null>(null)
	const [editingDecisionNodeId, setEditingDecisionNodeId] = useState<string | null>(null)

	const openEditor = useCallback((nodeId: string) => {
		const n = nodes.find(n => n.id === nodeId)
		if (!n) return
		if (n.type === 'inputText') setEditingInputNodeId(nodeId)
		if (n.type === 'decision') setEditingDecisionNodeId(nodeId)
	}, [nodes])

	const attachEditor = useCallback((n: FlowNode<any>): FlowNode<any> => ({
		...n,
		data: { ...n.data, openEditor }
	}), [openEditor])

	const onConnect = useCallback((connection: Connection) => {
		setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
		// Infer schema if connecting Input -> Decision
		setNodes((prev) => {
			const sourceNode = prev.find(n => n.id === connection.source)
			const targetNode = prev.find(n => n.id === connection.target)
			if (sourceNode?.type === 'inputText' && targetNode?.type === 'decision') {
				const fields: InputFieldConfig[] = (sourceNode.data.base as InputTextNode).config.fields
				const schema = inputFieldsToJsonSchema(fields)
				return prev.map(n => n.id === targetNode.id ? { ...n, data: { ...n.data, base: { ...n.data.base, inputSchema: schema } } } : n)
			}
			return prev
		})
	}, [setEdges, setNodes])

	const onEdgesChangeWithSchema = useCallback((changes: any) => {
		onEdgesChange(changes)
		// If edges removed, we could clear schema or recompute from remaining inbound edges.
		// For now, we keep the last known schema.
	}, [onEdgesChange])

	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		event.dataTransfer.dropEffect = 'move'
	}, [])

	const onDrop = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		const type = event.dataTransfer.getData('application/reactflow')
		const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
		if (type === 'inputText') {
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
		}
		if (type === 'decision') {
			const decisions: DecisionCondition[] = []
			const base: DecisionNode = {
				id: crypto.randomUUID(),
				type: 'decision',
				name: 'Decision',
				inputSchema: {},
				outputSchema: {},
				config: { decisions },
				validationLogic: undefined,
				connections: [],
			}
			const node: FlowNode<DecisionNodeData, 'decision'> = {
				id: base.id,
				type: 'decision',
				position,
				data: { base, sampleInput: {}, openEditor },
			}
			setNodes((prev) => [...prev, node])
		}
	}, [screenToFlowPosition, setNodes, openEditor])

	const editingInputNode = useMemo(() => nodes.find(n => n.id === editingInputNodeId) ?? null, [nodes, editingInputNodeId])
	const editingDecisionNode = useMemo(() => nodes.find(n => n.id === editingDecisionNodeId) ?? null, [nodes, editingDecisionNodeId])

	return (
		<div className="flex gap-4">
			<aside className="w-64 shrink-0 border border-slate-200 rounded-lg bg-white p-3 h-[80vh]">
				<div className="text-sm font-medium text-slate-800 mb-3">Nodes</div>
				<div
					className="rounded-md border border-slate-200 p-3 bg-slate-50 cursor-move mb-2"
					draggable
					onDragStart={(event) => {
						event.dataTransfer.setData('application/reactflow', 'inputText')
						event.dataTransfer.effectAllowed = 'move'
					}}
				>
					<div className="text-xs font-medium text-slate-700">Input Node</div>
					<div className="text-[11px] text-slate-500">Multiple fields</div>
				</div>
				<div
					className="rounded-md border border-slate-200 p-3 bg-slate-50 cursor-move"
					draggable
					onDragStart={(event) => {
						event.dataTransfer.setData('application/reactflow', 'decision')
						event.dataTransfer.effectAllowed = 'move'
					}}
				>
					<div className="text-xs font-medium text-slate-700">Decision</div>
					<div className="text-[11px] text-slate-500">Binary or N-way outcomes</div>
				</div>
			</aside>
			<div className="flex-1 min-w-0 h-[80vh] rounded-lg overflow-hidden border border-slate-200">
				<ReactFlow
					nodes={nodes.map(attachEditor)}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChangeWithSchema}
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
				isOpen={Boolean(editingInputNode)}
				fields={editingInputNode?.data.base.config.fields ?? []}
				currentValues={editingInputNode?.data.value ?? {}}
				onClose={() => setEditingInputNodeId(null)}
				onSave={(updates) => {
					setNodes((prev) => prev.map(n => n.id === editingInputNodeId ? {
						...n,
						data: {
							...n.data,
							base: {
								...n.data.base,
								config: { ...n.data.base.config, fields: updates.fields },
							}
						}
					} : n))
					setEditingInputNodeId(null)
				}}
			/>

			{editingDecisionNode && (
				<DecisionNodeEditModal
					isOpen={Boolean(editingDecisionNode)}
					node={editingDecisionNode.data.base as DecisionNode}
					onClose={() => setEditingDecisionNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingDecisionNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...(n.data.base as DecisionNode).config, decisions: updates.decisions },
								}
							}
						} : n))
						setEditingDecisionNodeId(null)
					}}
				/>
			)}
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