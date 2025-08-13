import { Link } from 'react-router-dom'

const dummySequences = Array.from({ length: 6 }).map((_, i) => ({
	id: `seq-${i + 1}`,
	name: `Sequence ${i + 1}`,
	status: i % 2 === 0 ? 'Draft' : 'Active',
	updated: 'just now',
}))

export default function Sequences() {
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
				{dummySequences.map((seq) => (
					<Link key={seq.id} to={`/sequences/${seq.id}`} className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition block">
						<div className="h-28 bg-slate-100 rounded mb-3" />
						<div className="font-medium">{seq.name}</div>
						<div className="text-xs text-slate-500">{seq.status} • Updated {seq.updated}</div>
					</Link>
				))}
			</div>
		</div>
	)
} 