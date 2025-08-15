import { useMemo, useState } from 'react'
import type { IfElseNode, DecisionPredicate } from '../../types/workflow'
import RuleBuilder from '../validation/RuleBuilder'
import type { AnyValidationConfig } from '../../types/validation'
import { compileValidationConfigToJsonLogic } from '../../utils/validation/compile'
import { applyJsonLogic } from '../../utils/validation/jsonLogic'

export type IfElseModalProps = {
	isOpen: boolean
	node: IfElseNode
	onClose: () => void
	onSave: (updates: { condition: any; trueLabel: string; falseLabel: string }) => void
}

export default function IfElseNodeEditModal({ isOpen, node, onClose, onSave }: IfElseModalProps) {
	const [condition, setCondition] = useState(node.config.condition || {
		id: crypto.randomUUID(),
		name: 'Condition',
		predicates: [],
		combiner: 'all'
	})
	const [trueLabel, setTrueLabel] = useState(node.config.trueLabel || 'True')
	const [falseLabel, setFalseLabel] = useState(node.config.falseLabel || 'False')
	const [sample, setSample] = useState<string>('{}')

	const parsedSample = useMemo(() => { try { return JSON.parse(sample) } catch { return {} } }, [sample])

	// Extract possible fields from the upstream schema (if object)
	const fieldOptions = useMemo(() => {
		const props = (node.inputSchema as any)?.properties as Record<string, unknown> | undefined
		if (!props) return []
		
		const fields: string[] = []
		
		// Add top-level properties
		for (const [key, value] of Object.entries(props)) {
			fields.push(key)
			
			// If this property is an object with its own properties, add nested fields
			if (value && typeof value === 'object' && 'properties' in value) {
				const nestedProps = (value as any).properties as Record<string, unknown> | undefined
				if (nestedProps) {
					for (const nestedKey of Object.keys(nestedProps)) {
						fields.push(`${key}.${nestedKey}`)
					}
				}
			}
		}
		
		return fields
	}, [node.inputSchema])

	// Check if this if-else node is connected to an API Call node
	const isConnectedToApiCall = useMemo(() => {
		return fieldOptions.includes('status') && fieldOptions.includes('data') && fieldOptions.includes('success')
	}, [fieldOptions])

	if (!isOpen) return null
	return (
		<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[980px] max-w-[98vw]">
				<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<div className="text-sm font-medium">Edit If-Else Condition</div>
					<button className="text-slate-500 text-sm" onClick={onClose}>Close</button>
				</div>
				<div className="p-4 space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs text-slate-600 mb-1">Condition Name</label>
							<input 
								className="border rounded px-2 py-1 text-sm w-full" 
								value={condition.name} 
								onChange={(e) => setCondition(prev => ({ ...prev, name: e.target.value }))} 
							/>
						</div>
						<div>
							<label className="block text-xs text-slate-600 mb-1">When</label>
							<select 
								className="border rounded px-2 py-1 text-sm w-full" 
								value={condition.combiner ?? 'all'} 
								onChange={(e) => setCondition(prev => ({ ...prev, combiner: e.target.value as 'all' | 'any' }))}
							>
								<option value="all">All predicates true</option>
								<option value="any">Any predicate true</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs text-slate-600 mb-1">True Output Label</label>
							<input 
								className="border rounded px-2 py-1 text-sm w-full" 
								value={trueLabel} 
								onChange={(e) => setTrueLabel(e.target.value)} 
								placeholder="True"
							/>
						</div>
						<div>
							<label className="block text-xs text-slate-600 mb-1">False Output Label</label>
							<input 
								className="border rounded px-2 py-1 text-sm w-full" 
								value={falseLabel} 
								onChange={(e) => setFalseLabel(e.target.value)} 
								placeholder="False"
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs text-slate-600 mb-1">Sample Input (JSON)</label>
						<textarea className="w-full border rounded p-2 text-xs h-28 font-mono" value={sample} onChange={(e) => setSample(e.target.value)} />
					</div>

					<div className="rounded-md border border-slate-200 p-3">
						<div className="text-xs font-medium text-slate-700 mb-2">Predicates</div>
						{fieldOptions.length === 0 && (
							<div className="text-[11px] text-red-600 mb-2">No fields available from upstream schema. Connect an input node first.</div>
						)}
						{isConnectedToApiCall && (
							<div className="text-[11px] text-blue-600 mb-2">💡 API Call detected: You can type custom field paths like "data.temperature", "data.user.name", etc.</div>
						)}
						<div className="space-y-3">
							{(condition.predicates ?? []).map((p) => {
								const tf = p.targetField ?? fieldOptions[0]
								const valueForRule = tf ? (parsedSample as any)[tf] : undefined
								return (
									<div key={p.id} className="rounded border border-slate-200 p-2">
										<div className="flex items-center gap-2 mb-2">
											{isConnectedToApiCall ? (
												<div className="flex-1">
													<input 
														className="w-full border rounded px-2 py-1 text-xs font-mono" 
														placeholder="Field path (e.g., data.temperature, status, success)"
														value={tf ?? ''} 
														onChange={(e) => setCondition(prev => ({ 
															...prev, 
															predicates: (prev.predicates ?? []).map(pp => 
																pp.id === p.id ? { ...pp, targetField: e.target.value } : pp
															) 
														}))}
													/>
													<div className="text-[10px] text-slate-500 mt-1">
														Suggested: data.temperature, data.city, status, success
													</div>
												</div>
											) : (
												<select 
													className="border rounded px-2 py-1 text-xs" 
													value={tf ?? ''} 
													onChange={(e) => setCondition(prev => ({ 
														...prev, 
														predicates: (prev.predicates ?? []).map(pp => 
															pp.id === p.id ? { ...pp, targetField: e.target.value } : pp
														) 
													}))}
												>
													{fieldOptions.map(k => <option key={k} value={k}>{k}</option>)}
												</select>
											)}
											<button 
												className="ml-auto text-[11px] text-red-600" 
												onClick={() => setCondition(prev => ({ 
													...prev, 
													predicates: (prev.predicates ?? []).filter(pp => pp.id !== p.id) 
												}))}
											>
												Remove
											</button>
										</div>
										{tf ? (
											<RuleBuilder 
												initial={p.validationConfig as AnyValidationConfig} 
												value={valueForRule} 
												onChange={(cfg) => setCondition(prev => ({ 
													...prev, 
													predicates: (prev.predicates ?? []).map(pp => 
														pp.id === p.id ? { 
															...pp, 
															validationConfig: cfg, 
															validationLogic: compileValidationConfigToJsonLogic(cfg) 
														} : pp
													) 
												}))} 
											/>
										) : (
											<div className="text-[11px] text-slate-500">Enter a field path to define rules.</div>
										)}
									</div>
								)
							})}
							<button 
								className="text-xs text-blue-700" 
								onClick={() => setCondition(prev => ({ 
									...prev, 
									predicates: [ 
										...(prev.predicates ?? []), 
										{ 
											id: crypto.randomUUID(), 
											targetField: isConnectedToApiCall ? 'data.' : fieldOptions[0] 
										} as DecisionPredicate 
									] 
								}))}
							>
								+ Add predicate
							</button>
						</div>
					</div>

					<div className="rounded-md border border-slate-200 p-3">
						<div className="text-xs font-medium text-slate-700 mb-2">Test Result</div>
						{(() => {
							if (!condition.predicates || condition.predicates.length === 0) {
								return <div className="text-red-700 text-xs">NO PREDICATES CONFIGURED</div>
							}
							const results = (condition.predicates ?? []).map(p => {
								const v = p.targetField ? (parsedSample as any)[p.targetField] : undefined
								return applyJsonLogic(p.validationLogic, { value: v }).isValid
							})
							const ok = (condition.combiner ?? 'all') === 'all' ? results.every(Boolean) : results.some(Boolean)
							return (
								<div className="space-y-1">
									<div className={ok ? 'text-green-700 text-xs' : 'text-red-700 text-xs'}>
										Condition evaluates to: <strong>{ok ? trueLabel : falseLabel}</strong>
									</div>
									<div className="text-[10px] text-slate-500">
										Output will go to the {ok ? 'True' : 'False'} branch
									</div>
								</div>
							)
						})()}
					</div>
				</div>
				<div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Cancel</button>
					<button 
						className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white" 
						onClick={() => onSave({ condition, trueLabel, falseLabel })}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	)
} 