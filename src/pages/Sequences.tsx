import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getDefaultRepository } from '../utils/persistence/LocalStorageWorkflowRepository'
import type { WorkflowRepository } from '../utils/persistence/WorkflowRepository'
import type { WorkflowSummary } from '../types/persistence'
import { executeWorkflow } from '../utils/workflow/runner'

export default function Sequences() {
	const repo: WorkflowRepository = useMemo(() => getDefaultRepository(), [])
	const [items, setItems] = useState<WorkflowSummary[]>([])
	const navigate = useNavigate()

	async function load() {
		const list = await repo.list()
		setItems(list)
	}

	useEffect(() => { load() }, [])

	return (
		<div>
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sequences</h2>
				<Link to="/sequences/new" className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
					Create Sequence
				</Link>
			</div>
			<p className="mt-2 text-slate-600">Create, edit, and monitor your workflow sequences.</p>
			<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{items.map((seq) => (
					<div key={seq.id} className="rounded-lg border border-slate-200 p-4">
						<div className="h-28 bg-slate-100 rounded mb-3" />
						<div className="font-medium">{seq.name}</div>
						<div className="text-xs text-slate-500">Updated {new Date(seq.updatedAt).toLocaleString()}</div>
						<div className="mt-3 flex items-center gap-2 text-sm">
							<button className="px-2 py-1 rounded border" onClick={() => navigate(`/sequences/${seq.id}`)}>Edit</button>
							<button className="px-2 py-1 rounded border" onClick={async () => {
								const wf = await repo.get(seq.id)
								if (!wf) return
								const beBase = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || (window as any)?.SEQUENCE_BE_BASE_URL
								if (beBase) {
									const res = await fetch(`${String(beBase).replace(/\/$/, '')}/workflows/${encodeURIComponent(seq.id)}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
									const data = await res.json()
									alert(JSON.stringify(data.logs, null, 2))
									return
								}
								const res = executeWorkflow(wf)
								alert(JSON.stringify(res.logs, null, 2))
							}}>Run</button>
							<button className="px-2 py-1 rounded border text-red-600" onClick={async () => { await repo.delete(seq.id); load() }}>Delete</button>
						</div>
					</div>
				))}
				{items.length === 0 && (
					<div className="text-sm text-slate-500">No sequences yet. Create one to get started.</div>
				)}
			</div>
		</div>
	)
} 