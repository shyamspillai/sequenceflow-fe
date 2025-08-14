import { useMemo, useState } from 'react'
import type { DecisionNode, DecisionCondition, DecisionPredicate } from '../../types/workflow'
import RuleBuilder from '../validation/RuleBuilder'
import type { AnyValidationConfig } from '../../types/validation'
import { compileValidationConfigToJsonLogic } from '../../utils/validation/compile'
import { applyJsonLogic } from '../../utils/validation/jsonLogic'

export type DecisionModalProps = {
	isOpen: boolean
	node: DecisionNode
	onClose: () => void
	onSave: (updates: { decisions: DecisionCondition[] }) => void
}

export default function DecisionNodeEditModal({ isOpen, node, onClose, onSave }: DecisionModalProps) {
	const [decisions, setDecisions] = useState<DecisionCondition[]>(node.config.decisions ?? [])
	const [selectedId, setSelectedId] = useState<string | null>(decisions[0]?.id ?? null)
	const selected = useMemo(() => decisions.find(d => d.id === selectedId) ?? null, [decisions, selectedId])
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

	// Check if this decision node is connected to an API Call node
	const isConnectedToApiCall = useMemo(() => {
		return fieldOptions.includes('status') && fieldOptions.includes('data') && fieldOptions.includes('success')
	}, [fieldOptions])

	if (!isOpen) return null
	return (
		<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[980px] max-w-[98vw]">
				<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<div className="text-sm font-medium">Edit Decisions</div>
					<button className="text-slate-500 text-sm" onClick={onClose}>Close</button>
				</div>
				<div className="p-4 grid grid-cols-3 gap-4">
					<aside className="col-span-1 border border-slate-200 rounded p-2">
						<div className="flex items-center justify-between mb-2">
							<div className="text-xs font-medium">Outcomes</div>
							<button className="text-xs text-blue-700" onClick={() => {
								const id = crypto.randomUUID()
								const d: DecisionCondition = { id, name: `Decision ${decisions.length + 1}`, combiner: 'all', predicates: [] }
								setDecisions(prev => [...prev, d])
								setSelectedId(id)
							}}>+ Add</button>
						</div>
						<div className="space-y-1 max-h-[420px] overflow-auto">
							{decisions.map(d => (
								<div key={d.id} className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between ${selectedId === d.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`} onClick={() => setSelectedId(d.id)}>
									<div className="text-xs truncate">{d.name}</div>
									<button className="text-[11px] text-red-600" onClick={(e) => { e.stopPropagation(); setDecisions(prev => prev.filter(x => x.id !== d.id)); if (selectedId === d.id) setSelectedId(decisions[0]?.id ?? null) }}>Remove</button>
								</div>
							))}
						</div>
					</aside>
					<div className="col-span-2 space-y-4">
						<div>
							<label className="block text-xs text-slate-600 mb-1">Sample Input (JSON)</label>
							<textarea className="w-full border rounded p-2 text-xs h-28 font-mono" value={sample} onChange={(e) => setSample(e.target.value)} />
						</div>
						{selected && (
							<div className="space-y-3">
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="block text-xs text-slate-600 mb-1">Decision Name</label>
										<input className="border rounded px-2 py-1 text-sm w-full" value={selected.name} onChange={(e) => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, name: e.target.value } : d))} />
									</div>
									<div>
										<label className="block text-xs text-slate-600 mb-1">When</label>
										<select className="border rounded px-2 py-1 text-sm w-full" value={selected.combiner ?? 'all'} onChange={(e) => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, combiner: e.target.value as 'all' | 'any' } : d))}>
											<option value="all">All predicates true</option>
											<option value="any">Any predicate true</option>
										</select>
									</div>
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
										{(selected.predicates ?? []).map((p) => {
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
																	onChange={(e) => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, predicates: (d.predicates ?? []).map(pp => pp.id === p.id ? { ...pp, targetField: e.target.value } : pp) } : d))}
																/>
																<div className="text-[10px] text-slate-500 mt-1">
																	Suggested: data.temperature, data.city, status, success
																</div>
															</div>
														) : (
															<select className="border rounded px-2 py-1 text-xs" value={tf ?? ''} onChange={(e) => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, predicates: (d.predicates ?? []).map(pp => pp.id === p.id ? { ...pp, targetField: e.target.value } : pp) } : d))}>
																{fieldOptions.map(k => <option key={k} value={k}>{k}</option>)}
															</select>
														)}
														<button className="ml-auto text-[11px] text-red-600" onClick={() => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, predicates: (d.predicates ?? []).filter(pp => pp.id !== p.id) } : d))}>Remove</button>
													</div>
													{tf ? (
														<RuleBuilder initial={p.validationConfig as AnyValidationConfig} value={valueForRule} onChange={(cfg) => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, predicates: (d.predicates ?? []).map(pp => pp.id === p.id ? { ...pp, validationConfig: cfg, validationLogic: compileValidationConfigToJsonLogic(cfg) } : pp) } : d))} />
													) : (
														<div className="text-[11px] text-slate-500">Enter a field path to define rules.</div>
													)}
												</div>
											)
										})}
										<button className="text-xs text-blue-700" onClick={() => setDecisions(prev => prev.map(d => d.id === selected.id ? { ...d, predicates: [ ...(d.predicates ?? []), { id: crypto.randomUUID(), targetField: isConnectedToApiCall ? 'data.' : fieldOptions[0] } as DecisionPredicate ] } : d))}>+ Add predicate</button>
									</div>
								</div>

								<div className="rounded-md border border-slate-200 p-3">
									<div className="text-xs font-medium text-slate-700 mb-2">Overall Test Result</div>
									{(() => {
										// Backward compatibility: single rule
										if (!selected.predicates || selected.predicates.length === 0) {
											const singleValue = selected.targetField ? (parsedSample as any)[selected.targetField] : parsedSample
											const res = applyJsonLogic(selected.validationLogic, { value: singleValue })
											return <div className={res.isValid ? 'text-green-700 text-xs' : 'text-red-700 text-xs'}>{res.isValid ? 'MATCH' : res.message ?? 'NO MATCH'}</div>
										}
										const results = (selected.predicates ?? []).map(p => {
											const v = p.targetField ? (parsedSample as any)[p.targetField] : undefined
											return applyJsonLogic(p.validationLogic, { value: v }).isValid
										})
										const ok = (selected.combiner ?? 'all') === 'all' ? results.every(Boolean) : results.some(Boolean)
										return <div className={ok ? 'text-green-700 text-xs' : 'text-red-700 text-xs'}>{ok ? 'MATCH' : 'NO MATCH'}</div>
									})()}
								</div>
							</div>
						)}
					</div>
				</div>
				<div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Cancel</button>
					<button className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white" onClick={() => onSave({ decisions })}>Save</button>
				</div>
			</div>
		</div>
	)
} 