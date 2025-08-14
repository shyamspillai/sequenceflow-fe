import { useCallback, useMemo, useState, useEffect } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useEdgesState, useNodesState, addEdge, type Node as FlowNode, type Edge, type Connection, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import InputTextNodeComponent from '../components/nodes/InputTextNode'
import DecisionNodeComponent from '../components/nodes/DecisionNode'
import type { InputTextNode, InputTextNodeData, InputFieldConfig, DecisionNode, DecisionNodeData, DecisionCondition, NotificationNode, NotificationNodeData, WorkflowNodeData } from '../types/workflow'
import NodeEditModal from '../components/nodes/NodeEditModal'
import DecisionNodeEditModal from '../components/nodes/DecisionNodeEditModal'
import { inputFieldsToJsonSchema } from '../utils/schema'
import NotificationNodeComponent from '../components/nodes/NotificationNode'
import NotificationNodeEditModal from '../components/nodes/NotificationNodeEditModal'
import { useParams, useNavigate } from 'react-router-dom'
import { getDefaultRepository } from '../utils/persistence/LocalStorageWorkflowRepository'
import type { WorkflowRepository } from '../utils/persistence/WorkflowRepository'
import { toPersistedWorkflow, fromPersistedWorkflow, validateWorkflowForSave } from '../utils/workflow/adapter'
import { executeWorkflow } from '../utils/workflow/runner'

function BuilderCanvas() {
	const nodeTypes = useMemo(() => ({ inputText: InputTextNodeComponent, decision: DecisionNodeComponent, notification: NotificationNodeComponent }), [])
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<any>>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const { screenToFlowPosition } = useReactFlow()
	const [editingInputNodeId, setEditingInputNodeId] = useState<string | null>(null)
	const [editingDecisionNodeId, setEditingDecisionNodeId] = useState<string | null>(null)
	const [editingNotificationNodeId, setEditingNotificationNodeId] = useState<string | null>(null)

	const { id } = useParams()
	const navigate = useNavigate()
	const repo: WorkflowRepository = useMemo(() => getDefaultRepository(), [])
	const [workflowName, setWorkflowName] = useState<string>('Untitled Workflow')
	const [workflowId, setWorkflowId] = useState<string | null>(null)
	const [createdAt, setCreatedAt] = useState<number | null>(null)
	const [runOutput, setRunOutput] = useState<string>('')

	useEffect(() => {
		let isMounted = true
		;(async () => {
			if (id) {
				const wf = await repo.get(id)
				if (wf && isMounted) {
					const { nodes, edges } = fromPersistedWorkflow(wf)
					setNodes(nodes)
					setEdges(edges)
					setWorkflowName(wf.name)
					setWorkflowId(wf.id)
					setCreatedAt(wf.createdAt)
				}
			} else {
				setNodes([])
				setEdges([])
				setWorkflowName('Untitled Workflow')
				setWorkflowId(null)
				setCreatedAt(null)
			}
		})()
		return () => { isMounted = false }
	}, [id, repo, setNodes, setEdges])

	const openEditor = useCallback((nodeId: string) => {
		const n = nodes.find(n => n.id === nodeId)
		if (!n) return
		if (n.type === 'inputText') setEditingInputNodeId(nodeId)
		if (n.type === 'decision') setEditingDecisionNodeId(nodeId)
		if (n.type === 'notification') setEditingNotificationNodeId(nodeId)
	}, [nodes])

	const propagateOutput = useCallback((sourceId: string, output: Record<string, unknown>) => {
		setNodes((prev) => {
			const visited = new Set<string>()
			const affected = new Set<string>()
			const queue: string[] = [sourceId]
			while (queue.length > 0) {
				const cur = queue.shift()!
				if (visited.has(cur)) continue
				visited.add(cur)
				const outs = edges.filter(e => e.source === cur)
				for (const e of outs) {
					affected.add(e.target)
					queue.push(e.target)
				}
			}

			let changed = false
			const outputsEqual = (a: any, b: any) => {
				try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
			}
			const next = prev.map(n => {
				if (n.id === sourceId) {
					const currentVal = (n.data as any)?.value
					if (!outputsEqual(currentVal, output)) {
						changed = true
						return { ...n, data: { ...n.data, value: output } }
					}
					return n
				}
				if (!affected.has(n.id)) return n
				const current = (n.data as any)?.inputValue
				if (outputsEqual(current, output)) return n
				changed = true
				return { ...n, data: { ...n.data, inputValue: output } }
			})
			return changed ? next : prev
		})
	}, [edges, setNodes])

	const attachEditor = useCallback((n: FlowNode<any>): FlowNode<any> => ({
		...n,
		data: { ...n.data, openEditor, updateOutput: propagateOutput }
	}), [openEditor, propagateOutput])

	const onConnect = useCallback((connection: Connection) => {
		setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
		setNodes((prev) => {
			const sourceNode = prev.find(n => n.id === connection.source)
			const targetNode = prev.find(n => n.id === connection.target)
			if (!sourceNode || !targetNode) return prev
			if (sourceNode.type === 'inputText' && targetNode.type === 'decision') {
				const fields: InputFieldConfig[] = (sourceNode.data.base as InputTextNode).config.fields
				const schema = inputFieldsToJsonSchema(fields)
				return prev.map(n => n.id === targetNode.id ? { ...n, data: { ...n.data, base: { ...n.data.base, inputSchema: schema } } } : n)
			}
			if (sourceNode.type === 'inputText' && targetNode.type === 'notification') {
				const fields: InputFieldConfig[] = (sourceNode.data.base as InputTextNode).config.fields
				const schema = inputFieldsToJsonSchema(fields)
				return prev.map(n => n.id === targetNode.id ? { ...n, data: { ...n.data, base: { ...n.data.base, inputSchema: schema } } } : n)
			}
			if (sourceNode.type === 'decision' && targetNode.type === 'notification') {
				const srcSchema = (sourceNode.data.base as DecisionNode).inputSchema
				return prev.map(n => n.id === targetNode.id ? { ...n, data: { ...n.data, base: { ...n.data.base, inputSchema: srcSchema } } } : n)
			}
			return prev
		})
		setTimeout(() => {
			setNodes((prev) => {
				const src = prev.find(n => n.id === connection.source)
				if (!src) return prev
				let output: Record<string, unknown> | null = null
				if (src.type === 'inputText') {
					output = (src.data.value as Record<string, unknown>) ?? {}
				}
				if (src.type === 'decision') {
					output = (src.data.inputValue as Record<string, unknown>) ?? {}
				}
				if (output) {
					queueMicrotask(() => propagateOutput(connection.source!, output!))
				}
				return prev
			})
		}, 0)
	}, [setEdges, setNodes, propagateOutput])

	const onEdgesChangeWithSchema = useCallback((changes: any) => {
		onEdgesChange(changes)
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
		if (type === 'notification') {
			const base: NotificationNode = {
				id: crypto.randomUUID(),
				type: 'notification',
				name: 'Notification',
				inputSchema: {},
				outputSchema: {},
				config: { template: '' },
				validationLogic: undefined,
				connections: [],
			}
			const node: FlowNode<NotificationNodeData, 'notification'> = {
				id: base.id,
				type: 'notification',
				position,
				data: { base, previewText: '', openEditor },
			}
			setNodes((prev) => [...prev, node])
		}
	}, [screenToFlowPosition, setNodes, openEditor])

	const editingInputNode = useMemo(() => nodes.find(n => n.id === editingInputNodeId) ?? null, [nodes, editingInputNodeId])
	const editingDecisionNode = useMemo(() => nodes.find(n => n.id === editingDecisionNodeId) ?? null, [nodes, editingDecisionNodeId])
	const editingNotificationNode = useMemo(() => nodes.find(n => n.id === editingNotificationNodeId) ?? null, [nodes, editingNotificationNodeId])

	async function handleSave() {
		const check = validateWorkflowForSave(nodes as Array<FlowNode<WorkflowNodeData>>, edges)
		if (!check.ok) {
			alert(check.errors.join('\n'))
			return
		}
		const payload = toPersistedWorkflow(nodes as Array<FlowNode<WorkflowNodeData>>, edges)
		if (!workflowId) {
			const created = await repo.create({ name: workflowName, workflow: payload })
			setWorkflowId(created.id)
			setCreatedAt(created.createdAt)
			navigate(`/sequences/${created.id}`)
		} else {
			const existing = await repo.get(workflowId)
			await repo.update({ id: workflowId, name: workflowName, ...payload, createdAt: existing?.createdAt ?? createdAt ?? Date.now(), updatedAt: Date.now() })
			alert('Saved')
		}
	}

	async function handleRun() {
		const payload = toPersistedWorkflow(nodes as Array<FlowNode<WorkflowNodeData>>, edges)
		const wf = { id: workflowId ?? 'temp', name: workflowName, ...payload, createdAt: Date.now(), updatedAt: Date.now() }
		const inputNode = (nodes as Array<FlowNode<WorkflowNodeData>>).find(n => n.type === 'inputText') as FlowNode<InputTextNodeData> | undefined
		const initial = (inputNode?.data?.value as Record<string, unknown>) ?? {}
		const beBase = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || (window as any)?.SEQUENCE_BE_BASE_URL
		if (beBase && workflowId) {
			const res = await fetch(`${String(beBase).replace(/\/$/, '')}/workflows/${encodeURIComponent(workflowId)}/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: initial }),
			})
			const data = await res.json()
			setRunOutput(JSON.stringify(data.logs, null, 2))
			return
		}
		const res = executeWorkflow(wf, initial)
		setRunOutput(JSON.stringify(res.logs, null, 2))
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<input className="px-2 py-1 border rounded text-sm" placeholder="Workflow name" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
				<button className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50" onClick={handleSave}>Save</button>
				<button className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50" onClick={handleRun}>Run</button>
			</div>
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
						className="rounded-md border border-slate-200 p-3 bg-slate-50 cursor-move mb-2"
						draggable
						onDragStart={(event) => {
							event.dataTransfer.setData('application/reactflow', 'decision')
							event.dataTransfer.effectAllowed = 'move'
						}}
					>
						<div className="text-xs font-medium text-slate-700">Decision</div>
						<div className="text-[11px] text-slate-500">Binary or N-way outcomes</div>
					</div>
					<div
						className="rounded-md border border-slate-200 p-3 bg-slate-50 cursor-move"
						draggable
						onDragStart={(event) => {
							event.dataTransfer.setData('application/reactflow', 'notification')
							event.dataTransfer.effectAllowed = 'move'
						}}
					>
						<div className="text-xs font-medium text-slate-700">Notification</div>
						<div className="text-[11px] text-slate-500">Compose message template</div>
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
			</div>
			{runOutput && (
				<div className="mt-2">
					<div className="text-sm font-medium">Run output</div>
					<pre className="text-xs bg-slate-50 border rounded p-2 max-h-40 overflow-auto">{runOutput}</pre>
				</div>
			)}

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
							},
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
								},
							}
						} : n))
						setEditingDecisionNodeId(null)
					}}
				/>
			)}

			{editingNotificationNode && (
				<NotificationNodeEditModal
					isOpen={Boolean(editingNotificationNode)}
					node={editingNotificationNode.data.base as NotificationNode}
					onClose={() => setEditingNotificationNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingNotificationNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...(n.data.base as NotificationNode).config, template: updates.template },
								},
							}
						} : n))
						setEditingNotificationNodeId(null)
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