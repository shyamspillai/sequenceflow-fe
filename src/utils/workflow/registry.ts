import { type Node as FlowNode, type XYPosition, type Connection } from '@xyflow/react'
import InputTextNodeComponent from '../../components/nodes/InputTextNode'
import DecisionNodeComponent from '../../components/nodes/DecisionNode'
import NotificationNodeComponent from '../../components/nodes/NotificationNode'
import ApiCallNodeComponent from '../../components/nodes/ApiCallNode'
import DelayNodeComponent from '../../components/nodes/DelayNode'
import IfElseNodeComponent from '../../components/nodes/IfElseNode'
import type {
	WorkflowNodeData,
	WorkflowNode,
	InputFieldConfig,
	InputTextNode,
	DecisionNode,
	NotificationNode,
	ApiCallNode,
	DelayNode,
	IfElseNode,
	HttpMethod,
} from '../../types/workflow'
import { inputFieldsToJsonSchema } from '../schema'
import { applyJsonLogic } from '../validation/jsonLogic'
import { interpolateTemplate, getByPath } from '../template'

export type PaletteItem = { type: string; label: string; description?: string }

export type NodeDefinition = {
	type: WorkflowNode['type']
	palette: PaletteItem
	reactFlowComponent: React.ComponentType<any>
	createBase(): WorkflowNode
	dataFromBase(base: WorkflowNode): WorkflowNodeData
	applyConnectionEffect?: (source: WorkflowNodeData, target: WorkflowNodeData) => WorkflowNodeData
	execute?: (base: WorkflowNode, payload: Record<string, unknown>) => {
		logs: Array<{ kind: 'notification' | 'input' | 'decision' | 'api' | 'api-error' | 'delay'; nodeId: string; name: string; content: string }>
		allowedSourceHandles?: Set<string>
		payload?: Record<string, unknown>
	}
}

function makeInputTextDef(): NodeDefinition {
	return {
		type: 'inputText',
		palette: { type: 'inputText', label: 'Input Node', description: 'Multiple fields' },
		reactFlowComponent: InputTextNodeComponent,
		createBase(): WorkflowNode {
			const fields: InputFieldConfig[] = []
			return {
				id: crypto.randomUUID(),
				type: 'inputText',
				name: 'Input Node',
				inputSchema: {},
				outputSchema: {},
				config: { fields },
				validationLogic: undefined,
				connections: [],
			}
		},
		dataFromBase(base: WorkflowNode): WorkflowNodeData { return { base: base as InputTextNode, value: {}, errors: {} } as any },
		applyConnectionEffect(source, target) {
			if ((source.base as any).type !== 'inputText') return target
			const fields: InputFieldConfig[] = (source.base as InputTextNode).config.fields
			const schema = inputFieldsToJsonSchema(fields)
			return { ...target, base: { ...target.base, inputSchema: schema } as any }
		},
		execute(base, payload) {
			return { logs: [{ kind: 'input', nodeId: (base as any).id, name: base.name, content: `Input: ${JSON.stringify(payload)}` }] }
		},
	}
}

function makeDecisionDef(): NodeDefinition {
	return {
		type: 'decision',
		palette: { type: 'decision', label: 'Decision', description: 'Binary or N-way outcomes' },
		reactFlowComponent: DecisionNodeComponent,
		createBase(): WorkflowNode {
			return {
				id: crypto.randomUUID(),
				type: 'decision',
				name: 'Decision',
				inputSchema: {},
				outputSchema: {},
				config: { decisions: [] },
				validationLogic: undefined,
				connections: [],
			}
		},
		dataFromBase(base: WorkflowNode): WorkflowNodeData { return { base: base as DecisionNode, sampleInput: {} } as any },
		applyConnectionEffect(source, target) {
			if ((target.base as any).type !== 'decision') return target
			const sourceSchema = (source.base as any).outputSchema || (source.base as any).inputSchema
			return { ...target, base: { ...target.base, inputSchema: sourceSchema } as any }
		},
		execute(base, payload) {
			const cfg: any = (base as any).config ?? {}
			const decisions: any[] = (cfg.decisions ?? []) as any[]
			const matches = new Set<string>()
			for (const d of decisions) {
				if (Array.isArray(d?.predicates) && d.predicates.length > 0) {
					const checks = d.predicates.map((p: any) => applyJsonLogic(p.validationLogic, { value: p.targetField ? getByPath(payload, p.targetField) : payload }).isValid)
					const combiner = (d.combiner ?? 'all') as 'all' | 'any'
					const valid = combiner === 'all' ? checks.every(Boolean) : checks.some(Boolean)
					if (valid) matches.add(d.id)
				} else {
					const subject = d?.targetField ? getByPath(payload, d.targetField) : payload
					const res = applyJsonLogic(d?.validationLogic, { value: subject })
					if (res.isValid) matches.add(d.id)
				}
			}
			const matchedIds = Array.from(matches)
			const logs = [{ kind: 'decision' as const, nodeId: (base as any).id, name: (base as any).name, content: `Matched ${matchedIds.length} outcome(s): ${matchedIds.join(', ') || 'none'}` }]
			const allowedSourceHandles = new Set<string>([...matchedIds.map(id => `out-${id}`)])
			return { logs, allowedSourceHandles }
		},
	}
}

function makeIfElseDef(): NodeDefinition {
	return {
		type: 'ifElse',
		palette: { type: 'ifElse', label: 'If-Else', description: 'Binary condition with true/false outcomes' },
		reactFlowComponent: IfElseNodeComponent,
		createBase(): WorkflowNode {
			return {
				id: crypto.randomUUID(),
				type: 'ifElse',
				name: 'If-Else',
				inputSchema: {},
				outputSchema: {},
				config: { 
					condition: {
						id: crypto.randomUUID(),
						name: 'Condition',
						predicates: [],
						combiner: 'all'
					},
					trueLabel: 'True',
					falseLabel: 'False'
				},
				validationLogic: undefined,
				connections: [],
			}
		},
		dataFromBase(base: WorkflowNode): WorkflowNodeData { return { base: base as IfElseNode, sampleInput: {} } as any },
		applyConnectionEffect(source, target) {
			if ((target.base as any).type !== 'ifElse') return target
			const sourceSchema = (source.base as any).outputSchema || (source.base as any).inputSchema
			return { ...target, base: { ...target.base, inputSchema: sourceSchema } as any }
		},
		execute(base, payload) {
			const cfg: any = (base as any).config ?? {}
			const condition = cfg.condition
			let conditionMet = false
			
			if (condition && Array.isArray(condition.predicates) && condition.predicates.length > 0) {
				const checks = condition.predicates.map((p: any) => {
					const value = p.targetField ? getByPath(payload, p.targetField) : payload
					return applyJsonLogic(p.validationLogic, { value }).isValid
				})
				const combiner = (condition.combiner ?? 'all') as 'all' | 'any'
				conditionMet = combiner === 'all' ? checks.every(Boolean) : checks.some(Boolean)
			}
			
			const outcome = conditionMet ? 'true' : 'false'
			const outcomeLabel = conditionMet ? (cfg.trueLabel || 'True') : (cfg.falseLabel || 'False')
			const logs = [{ kind: 'decision' as const, nodeId: (base as any).id, name: (base as any).name, content: `Condition evaluated to: ${outcomeLabel}` }]
			const allowedSourceHandles = new Set<string>([`out-${outcome}`])
			return { logs, allowedSourceHandles }
		},
	}
}

function makeNotificationDef(): NodeDefinition {
	return {
		type: 'notification',
		palette: { type: 'notification', label: 'Notification', description: 'Compose message template' },
		reactFlowComponent: NotificationNodeComponent,
		createBase(): WorkflowNode {
			return {
				id: crypto.randomUUID(),
				type: 'notification',
				name: 'Notification',
				inputSchema: {},
				outputSchema: {},
				config: { template: '' },
				validationLogic: undefined,
				connections: [],
			}
		},
		dataFromBase(base: WorkflowNode): WorkflowNodeData { return { base: base as NotificationNode, previewText: '' } as any },
		applyConnectionEffect(source, target) {
			if ((target.base as any).type !== 'notification') return target
			const sourceSchema = (source.base as any).outputSchema || (source.base as any).inputSchema
			return { ...target, base: { ...target.base, inputSchema: sourceSchema } as any }
		},
		execute(base, payload) {
			const content = interpolateTemplate(((base as any).config ?? {}).template ?? '', payload as any)
			return { logs: [{ kind: 'notification', nodeId: (base as any).id, name: (base as any).name, content }] }
		},
	}
}

function makeApiCallDef(): NodeDefinition {
	return {
		type: 'apiCall',
		palette: { type: 'apiCall', label: 'API Call', description: 'HTTP request to external service' },
		reactFlowComponent: ApiCallNodeComponent,
		createBase(): WorkflowNode {
			return {
				id: crypto.randomUUID(),
				type: 'apiCall',
				name: 'API Call',
				inputSchema: {},
				outputSchema: {
					type: 'object',
					properties: {
						status: { type: 'number' },
						statusText: { type: 'string' },
						data: { 
							type: 'object',
							properties: {
								// Common fields that might be in API responses
								id: { type: 'string' },
								name: { type: 'string' },
								city: { type: 'string' },
								temperature: { type: 'number' },
								condition: { type: 'string' },
								humidity: { type: 'number' },
								timestamp: { type: 'string' },
								message: { type: 'string' },
								value: { type: 'string' },
								count: { type: 'number' },
								result: { type: 'string' }
							}
						},
						headers: { type: 'object' },
						success: { type: 'boolean' },
						error: { type: 'string' }
					}
				},
				config: {
					method: 'GET' as HttpMethod,
					url: 'https://api.example.com/endpoint',
					headers: [],
					timeoutMs: 10000,
					expectedStatusCodes: [200, 201, 202, 204]
				},
				validationLogic: undefined,
				connections: [],
			}
		},
		dataFromBase(base: WorkflowNode): WorkflowNodeData { 
			return { 
				base: base as ApiCallNode, 
				responsePreview: undefined 
			} as any 
		},
		applyConnectionEffect(source, target) {
			// API Call accepts any input schema for templating
			if ((target.base as any).type !== 'apiCall') return target
			const sourceSchema = (source.base as any).outputSchema || (source.base as any).inputSchema
			return { ...target, base: { ...target.base, inputSchema: sourceSchema } as any }
		},
		execute(base, payload) {
			// Frontend execution simulation (actual HTTP calls happen on backend)
			const apiBase = base as ApiCallNode
			const url = interpolateTemplate(apiBase.config.url, payload as any)
			return { 
				logs: [{ 
					kind: 'api' as const, 
					nodeId: (base as any).id, 
					name: (base as any).name, 
					content: `API Call: ${apiBase.config.method} ${url} (simulated)` 
				}],
				payload: {
					status: 200,
					statusText: 'OK',
					data: { simulated: true, input: payload },
					headers: {},
					success: true
				}
			}
		},
	}
}

function makeDelayDef(): NodeDefinition {
	return {
		type: 'delay',
		palette: { type: 'delay', label: 'Delay', description: 'Wait for a specified duration' },
		reactFlowComponent: DelayNodeComponent,
		createBase(): WorkflowNode {
			return {
				id: crypto.randomUUID(),
				type: 'delay',
				name: 'Delay',
				inputSchema: {},
				outputSchema: {},
				config: { 
					delayType: 'seconds',
					delayValue: 5
				},
				validationLogic: undefined,
				connections: [],
			}
		},
		dataFromBase(base: WorkflowNode): WorkflowNodeData { return { base: base as DelayNode } as any },
		applyConnectionEffect(source, target) {
			if ((target.base as any).type !== 'delay') return target
			const sourceSchema = (source.base as any).outputSchema || (source.base as any).inputSchema
			return { ...target, base: { ...target.base, inputSchema: sourceSchema, outputSchema: sourceSchema } as any }
		},
		execute(base, payload) {
			const delayBase = base as DelayNode
			const { delayType, delayValue } = delayBase.config
			
			// Format delay for display
			const formatDelay = (type: string, value: number): string => {
				if (value === 1) {
					return `1 ${type.slice(0, -1)}`
				}
				return `${value} ${type}`
			}
			
			return {
				logs: [{ kind: 'delay', nodeId: (base as any).id, name: (base as any).name, content: `Delay scheduled: ${formatDelay(delayType, delayValue)}` }],
				payload
			}
		},
	}
}

const registry: NodeDefinition[] = [makeInputTextDef(), makeDecisionDef(), makeIfElseDef(), makeNotificationDef(), makeApiCallDef(), makeDelayDef()]

export function getReactFlowNodeTypes(): Record<string, React.ComponentType<any>> {
	const map: Record<string, React.ComponentType<any>> = {}
	for (const def of registry) map[def.type] = def.reactFlowComponent
	return map
}

export function getPalette(): PaletteItem[] {
	return registry.map(r => r.palette)
}

export function createNodeOnDrop(type: string, position: XYPosition, openEditor: (nodeId: string) => void): FlowNode<WorkflowNodeData> | null {
	const def = registry.find(r => r.type === type)
	if (!def) return null
	const base = def.createBase() as WorkflowNode
	const data = { ...def.dataFromBase(base as any), openEditor } as WorkflowNodeData
	return { id: base.id, type: base.type, position, data }
}

export function applyConnectionEffects(prev: Array<FlowNode<WorkflowNodeData>>, connection: Connection): Array<FlowNode<WorkflowNodeData>> {
	const sourceNode = prev.find(n => n.id === connection.source)
	const targetNode = prev.find(n => n.id === connection.target)
	if (!sourceNode || !targetNode) return prev
	const sourceData = sourceNode.data as WorkflowNodeData
	const targetData = targetNode.data as WorkflowNodeData
	let updated: WorkflowNodeData | null = null
	for (const def of registry) {
		if (def.applyConnectionEffect) {
			const next = def.applyConnectionEffect(sourceData, targetData)
			if (next !== targetData) { updated = next }
		}
	}
	if (!updated) return prev
	return prev.map(n => n.id === targetNode.id ? { ...n, data: updated! } : n)
}

export type ExecutionLog = { kind: 'notification' | 'input' | 'decision' | 'api' | 'api-error' | 'delay'; nodeId: string; name: string; content: string }

export function executeNodeByType(type: string, base: WorkflowNode, payload: Record<string, unknown>): { logs: ExecutionLog[]; allowedSourceHandles?: Set<string>; payload?: Record<string, unknown> } {
	const def = registry.find(r => r.type === type)
	if (!def || !def.execute) return { logs: [] }
	return def.execute(base as any, payload)
}

export function dataFromBaseUsingRegistry(base: WorkflowNode): WorkflowNodeData | null {
	const def = registry.find(r => r.type === base.type)
	return def ? (def.dataFromBase as any)(base) : null
} 