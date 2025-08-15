import { useCallback, useMemo, useState, useEffect } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, useEdgesState, useNodesState, addEdge, type Node as FlowNode, type Edge, type Connection, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { InputTextNodeData, DecisionNode, NotificationNode, ApiCallNode, WorkflowNodeData } from '../types/workflow'
import NodeEditModal from '../components/nodes/NodeEditModal'
import DecisionNodeEditModal from '../components/nodes/DecisionNodeEditModal'
import NotificationNodeEditModal from '../components/nodes/NotificationNodeEditModal'
import ApiCallNodeEditModal from '../components/nodes/ApiCallNodeEditModal'
import { useParams, useNavigate } from 'react-router-dom'
import { getDefaultRepository } from '../utils/persistence/LocalStorageWorkflowRepository'
import type { WorkflowRepository } from '../utils/persistence/WorkflowRepository'
import { toPersistedWorkflow, fromPersistedWorkflow, validateWorkflowForSave } from '../utils/workflow/adapter'
import { executeWorkflow } from '../utils/workflow/runner'
import { applyConnectionEffects, createNodeOnDrop, getPalette, getReactFlowNodeTypes } from '../utils/workflow/registry'

function BuilderCanvas() {
	const nodeTypes = useMemo(() => getReactFlowNodeTypes(), [])
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<any>>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const { screenToFlowPosition } = useReactFlow()
	const [editingInputNodeId, setEditingInputNodeId] = useState<string | null>(null)
	const [editingDecisionNodeId, setEditingDecisionNodeId] = useState<string | null>(null)
	const [editingNotificationNodeId, setEditingNotificationNodeId] = useState<string | null>(null)
	const [editingApiCallNodeId, setEditingApiCallNodeId] = useState<string | null>(null)

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
					// Clear input node values when loading a workflow
					setInputNodeValues({})
				}
			} else {
				setNodes([])
				setEdges([])
				setWorkflowName('Untitled Workflow')
				setWorkflowId(null)
				setCreatedAt(null)
				// Clear input node values when creating new workflow
				setInputNodeValues({})
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
		if (n.type === 'apiCall') setEditingApiCallNodeId(nodeId)
	}, [nodes])

	// Store current input values from all input nodes
	const [inputNodeValues, setInputNodeValues] = useState<Record<string, Record<string, unknown>>>({})

	// Callback for input nodes to report their current values
	const updateInputNodeValues = useCallback((nodeId: string, values: Record<string, unknown>) => {
		setInputNodeValues(prev => ({ ...prev, [nodeId]: values }))
	}, [])

	// Remove live data propagation - only attach editor callbacks and value update callback
	const attachEditor = useCallback((n: FlowNode<any>): FlowNode<any> => ({
		...n,
		data: { 
			...n.data, 
			openEditor,
			updateNodeValues: n.type === 'inputText' ? updateInputNodeValues : undefined
		}
	}), [openEditor, updateInputNodeValues])

	const onConnect = useCallback((connection: Connection) => {
		setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
		setNodes((prev) => applyConnectionEffects(prev as Array<FlowNode<WorkflowNodeData>>, connection))
	}, [setEdges, setNodes])

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
		const node = createNodeOnDrop(type, position, openEditor)
		if (node) setNodes((prev) => [...prev, node])
	}, [screenToFlowPosition, setNodes, openEditor])

	const editingInputNode = useMemo(() => nodes.find(n => n.id === editingInputNodeId) ?? null, [nodes, editingInputNodeId])
	const editingDecisionNode = useMemo(() => nodes.find(n => n.id === editingDecisionNodeId) ?? null, [nodes, editingDecisionNodeId])
	const editingNotificationNode = useMemo(() => nodes.find(n => n.id === editingNotificationNodeId) ?? null, [nodes, editingNotificationNodeId])
	const editingApiCallNode = useMemo(() => nodes.find(n => n.id === editingApiCallNodeId) ?? null, [nodes, editingApiCallNodeId])

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
		
		// Extract input values from stored input node values
		const initial: Record<string, unknown> = {}
		
		// Get all input nodes and their current field values
		const inputNodes = nodes.filter(n => n.type === 'inputText') as Array<FlowNode<InputTextNodeData>>
		
		for (const inputNode of inputNodes) {
			const nodeValues = inputNodeValues[inputNode.id] || {}
			// Merge all input node values into the initial payload
			Object.assign(initial, nodeValues)
		}
		
		const beBase = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || (window as any)?.SEQUENCE_BE_BASE_URL
		if (beBase && workflowId) {
			// Use async execution endpoint
			const res = await fetch(`${String(beBase).replace(/\/$/, '')}/workflows/${encodeURIComponent(workflowId)}/execute-async`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: initial }),
			})
			const asyncResult = await res.json()
			const runId = asyncResult.runId
			
			// Poll for completion
			let attempts = 0
			const maxAttempts = 30
			
			while (attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 1000))
				
				try {
					const statusRes = await fetch(`${String(beBase).replace(/\/$/, '')}/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/status`)
					const status = await statusRes.json()
					
					if (status.status === 'succeeded' || status.status === 'failed') {
						setRunOutput(JSON.stringify(status.logs, null, 2))
						return
					}
					
					attempts++
				} catch (error) {
					attempts++
				}
			}
			
			setRunOutput(`Workflow execution timed out after ${maxAttempts} seconds`)
			return
		}
		const res = executeWorkflow(wf, initial)
		setRunOutput(JSON.stringify(res.logs, null, 2))
	}

	const palette = useMemo(() => getPalette(), [])

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
					{palette.map(p => (
						<div
							key={p.type}
							className="rounded-md border border-slate-200 p-3 bg-slate-50 cursor-move mb-2"
							draggable
							onDragStart={(event) => {
								event.dataTransfer.setData('application/reactflow', p.type)
								event.dataTransfer.effectAllowed = 'move'
							}}
						>
							<div className="text-xs font-medium text-slate-700">{p.label}</div>
							{p.description ? <div className="text-[11px] text-slate-500">{p.description}</div> : null}
						</div>
					))}
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

			{editingApiCallNode && (
				<ApiCallNodeEditModal
					isOpen={Boolean(editingApiCallNode)}
					node={editingApiCallNode.data.base as ApiCallNode}
					onClose={() => setEditingApiCallNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingApiCallNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...(n.data.base as ApiCallNode).config, ...updates },
								},
							}
						} : n))
						setEditingApiCallNodeId(null)
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