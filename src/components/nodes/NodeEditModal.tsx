import { useMemo, useState } from 'react'
import type { InputFieldConfig, InputKind } from '../../types/workflow'
import RuleBuilder from '../validation/RuleBuilder'
import type { AnyValidationConfig } from '../../types/validation'
import { compileValidationConfigToJsonLogic } from '../../utils/validation/compile'
import { applyJsonLogic } from '../../utils/validation/jsonLogic'

export type NodeEditModalProps = {
	isOpen: boolean
	fields: InputFieldConfig[]
	currentValues: Record<string, string | number>
	onClose: () => void
	onSave: (updates: { fields: InputFieldConfig[] }) => void
}

export default function NodeEditModal({ isOpen, fields, currentValues, onClose, onSave }: NodeEditModalProps) {
	const [localFields, setLocalFields] = useState<InputFieldConfig[]>(fields)
	const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id ?? null)
	const selectedField = useMemo(() => localFields.find(f => f.id === selectedFieldId) ?? null, [localFields, selectedFieldId])

	const [testValues, setTestValues] = useState<Record<string, string>>(
		Object.fromEntries(localFields.map((f) => [f.key, String(currentValues[f.key] ?? f.defaultValue ?? '')])) as Record<string, string>
	)

	const expectations = useMemo(() => {
		const shape: Record<string, unknown> = {}
		for (const f of localFields) shape[f.key] = f.inputKind === 'number' ? 0 : (f.inputKind === 'date' ? 'YYYY-MM-DD' : 'string')
		return shape
	}, [localFields])

	if (!isOpen) return null
	return (
		<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[980px] max-w-[98vw]">
				<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<div className="text-sm font-medium">Edit Input Node</div>
					<button className="text-slate-500 text-sm" onClick={onClose}>Close</button>
				</div>
				<div className="p-4 grid grid-cols-3 gap-4">
					<aside className="col-span-1 border border-slate-200 rounded p-2">
						<div className="flex items-center justify-between mb-2">
							<div className="text-xs font-medium">Fields</div>
							<button className="text-xs text-blue-700" onClick={() => {
								const id = crypto.randomUUID()
								const newField: InputFieldConfig = { id, key: `field_${localFields.length + 1}`, label: 'New Field', inputKind: 'text', placeholder: '', defaultValue: '', validationConfig: { kind: 'text', combiner: 'all', rules: [] } as AnyValidationConfig }
								setLocalFields([...localFields, newField])
								setSelectedFieldId(id)
							}}>+ Add</button>
						</div>
						<div className="space-y-1 max-h-[420px] overflow-auto">
							{localFields.map(f => (
								<div key={f.id} className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between ${selectedFieldId === f.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`} onClick={() => setSelectedFieldId(f.id)}>
									<div className="text-xs truncate">{f.label} <span className="text-slate-400">({f.key})</span></div>
									<button className="text-[11px] text-red-600" onClick={(e) => { e.stopPropagation(); setLocalFields(localFields.filter(x => x.id !== f.id)); if (selectedFieldId === f.id) setSelectedFieldId(localFields[0]?.id ?? null) }}>Remove</button>
								</div>
							))}
						</div>

						<div className="mt-3 border-t pt-3">
							<div className="text-xs font-medium text-slate-700 mb-1">Expectation</div>
							<pre className="text-[11px] bg-slate-50 rounded border border-slate-200 p-2 overflow-auto">{JSON.stringify(expectations, null, 2)}</pre>
							<div className="text-[11px] text-slate-500 mt-1">Your input should be an object with these keys and types.</div>
						</div>
					</aside>
					<div className="col-span-2 space-y-4">
						{selectedField && (
							<div className="space-y-3">
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="block text-xs text-slate-600 mb-1">Label</label>
										<input className="border rounded px-2 py-1 text-sm w-full" value={selectedField.label} onChange={(e) => setLocalFields(localFields.map(f => f.id === selectedField.id ? { ...f, label: e.target.value } : f))} />
									</div>
									<div>
										<label className="block text-xs text-slate-600 mb-1">Key</label>
										<input className="border rounded px-2 py-1 text-sm w-full" value={selectedField.key} onChange={(e) => setLocalFields(localFields.map(f => f.id === selectedField.id ? { ...f, key: e.target.value } : f))} />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="block text-xs text-slate-600 mb-1">Type</label>
										<select className="border rounded px-2 py-1 text-sm w-full" value={selectedField.inputKind} onChange={(e) => setLocalFields(localFields.map(f => f.id === selectedField.id ? { ...f, inputKind: e.target.value as InputKind } : f))}>
											<option value="text">Text</option>
											<option value="number">Number</option>
											<option value="date">Date</option>
										</select>
									</div>
									<div>
										<label className="block text-xs text-slate-600 mb-1">Placeholder</label>
										<input className="border rounded px-2 py-1 text-sm w-full" value={selectedField.placeholder ?? ''} onChange={(e) => setLocalFields(localFields.map(f => f.id === selectedField.id ? { ...f, placeholder: e.target.value } : f))} />
									</div>
								</div>
								<div>
									<label className="block text-xs text-slate-600 mb-1">Default Value</label>
									<input className="border rounded px-2 py-1 text-sm w-full" value={String(selectedField.defaultValue ?? '')} onChange={(e) => setLocalFields(localFields.map(f => f.id === selectedField.id ? { ...f, defaultValue: e.target.value } : f))} />
								</div>

								<div className="rounded-md border border-slate-200 p-3">
									<div className="text-xs font-medium text-slate-700 mb-2">Validation Rules</div>
									<RuleBuilder initial={selectedField.validationConfig} value={currentValues[selectedField.key]} onChange={(cfg) => {
										setLocalFields((prev) => prev.map(f => f.id === selectedField.id ? { ...f, validationConfig: cfg, validationLogic: compileValidationConfigToJsonLogic(cfg) } : f))
									}} />
								</div>

								<div className="rounded-md border border-slate-200 p-3">
									<div className="text-xs font-medium text-slate-700 mb-2">Try sample values</div>
									<div className="space-y-2">
										{localFields.map((f) => {
											const rule = f.validationLogic
											const testVal = testValues[f.key] ?? ''
											const result = applyJsonLogic(rule, { value: f.inputKind === 'number' ? Number(testVal) : testVal })
											return (
												<div key={f.id} className="grid grid-cols-3 gap-2 items-center">
													<div className="text-[11px] text-slate-600">{f.label}</div>
													<input className="border rounded px-2 py-1 text-xs col-span-2" value={testVal} onChange={(e) => setTestValues((prev) => ({ ...prev, [f.key]: e.target.value }))} />
													<div className={`text-[11px] ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>{result.isValid ? 'Valid' : result.message ?? 'Invalid value'}</div>
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
				<div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Cancel</button>
					<button className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white" onClick={() => {
						onSave({ fields: localFields })
					}}>Save</button>
				</div>
			</div>
		</div>
	)
} 