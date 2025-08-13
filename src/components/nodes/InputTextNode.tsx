import { memo, useEffect, useMemo, useState } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { InputTextNodeData, InputFieldConfig } from '../../types/workflow'
import { applyJsonLogic } from '../../utils/validation/jsonLogic'
import TextField from './inputs/TextField'
import NumberField from './inputs/NumberField'
import DateField from './inputs/DateField'

function FieldInput({ field, value, onChange, invalid }: { field: InputFieldConfig; value: string | number | undefined; onChange: (v: string | number) => void; invalid: boolean }) {
	if (field.inputKind === 'text') {
		return <TextField value={String(value ?? '')} placeholder={field.placeholder} onChange={(v) => onChange(v)} invalid={invalid} />
	}
	if (field.inputKind === 'number') {
		return <NumberField value={typeof value === 'number' ? value : ''} placeholder={field.placeholder} onChange={(v) => onChange(v === '' ? '' : Number(v))} invalid={invalid} />
	}
	return <DateField value={String(value ?? '')} placeholder={field.placeholder} onChange={(v) => onChange(v)} invalid={invalid} />
}

function InputTextNodeComponent({ data }: NodeProps<FlowNode<InputTextNodeData>>) {
	const { base } = data
	const initialValues = useMemo(() => {
		const map: Record<string, string | number> = {}
		for (const f of base.config.fields ?? []) {
			if (f.defaultValue !== undefined) map[f.key] = f.defaultValue
		}
		return map
	}, [base.config.fields])
	const [values, setValues] = useState<Record<string, string | number>>(data.value ?? initialValues)

	const validations = useMemo(() => {
		const errs: Record<string, string | null> = {}
		for (const f of base.config.fields ?? []) {
			const v = values[f.key]
			const res = applyJsonLogic(f.validationLogic, { value: v })
			errs[f.key] = res.isValid ? null : res.message ?? 'Invalid value'
		}
		return errs
	}, [base.config.fields, values])

	useEffect(() => {
		data.value = values
		data.errors = validations
	}, [values, validations, data])

	const expectedKeys = useMemo(() => (base.config.fields ?? []).map(f => f.key), [base.config.fields])

	return (
		<div className="rounded-md border border-slate-200 bg-white shadow-sm w-[320px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button className="text-[11px] text-blue-700" onClick={() => data.openEditor?.(base.id)}>Edit</button>
			</div>
			<div className="p-3 space-y-3">
				{expectedKeys.length > 0 && (
					<div className="text-[10px] text-slate-500">
						Expected keys: <span className="text-slate-700">{expectedKeys.join(', ')}</span>
					</div>
				)}
				{(base.config.fields ?? []).map((field) => {
					const invalid = Boolean(validations[field.key])
					return (
						<div key={field.id}>
							<label className="block text-[11px] text-slate-500 mb-1">{field.label}</label>
							<FieldInput
								field={field}
								value={values[field.key]}
								onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
								invalid={invalid}
							/>
							{invalid && (
								<div className="mt-1 text-[11px] text-red-600">{validations[field.key]}</div>
							)}
						</div>
					)
				})}
			</div>
			<Handle type="source" position={Position.Right} id="out" />
		</div>
	)
}

export default memo(InputTextNodeComponent) 