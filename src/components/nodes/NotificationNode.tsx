import { memo, useEffect, useMemo, useState } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { NotificationNodeData } from '../../types/workflow'
import { exampleFromSchema } from '../../utils/schema'
import { interpolateTemplate } from '../../utils/template'

function NotificationNodeComponent({ data }: NodeProps<FlowNode<NotificationNodeData>>) {
	const { base } = data
	const [sample, setSample] = useState<Record<string, unknown>>({})

	useEffect(() => {
		if (base.inputSchema) {
			const ex = exampleFromSchema(base.inputSchema)
			if (ex && typeof ex === 'object') setSample(ex as Record<string, unknown>)
		}
	}, [base.inputSchema])

	const effectiveInput = useMemo(() => {
		return (data.inputValue ?? sample) as Record<string, any>
	}, [data.inputValue, sample])

	const preview = useMemo(() => interpolateTemplate(base.config.template ?? '', effectiveInput), [base.config.template, effectiveInput])

	return (
		<div className="rounded-md border border-slate-200 bg-white shadow-sm w-[360px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button className="text-[11px] text-blue-700" onClick={() => data.openEditor?.(base.id)}>Edit</button>
			</div>
			<div className="p-3 space-y-2">
				<div className="text-[11px] text-slate-500">Notification preview</div>
				<div className="text-[12px] text-slate-800 whitespace-pre-wrap break-words border rounded p-2 min-h-12">
					{preview || <span className="text-slate-400">No template</span>}
				</div>
			</div>
			<Handle type="target" position={Position.Left} id="in" />
		</div>
	)
}

export default memo(NotificationNodeComponent) 