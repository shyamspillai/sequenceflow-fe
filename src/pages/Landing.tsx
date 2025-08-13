import { Link } from 'react-router-dom'

export default function Landing() {
	return (
		<div className="text-center">
			<h1 className="text-3xl font-semibold tracking-tight text-slate-900">Build automated workflows with confidence</h1>
			<p className="mt-3 text-slate-600 max-w-2xl mx-auto">
				Design, test, and ship sequences that connect your triggers to powerful actions. Explore the app to get started.
			</p>
			<div className="mt-6 flex items-center justify-center gap-3">
				<Link to="/sequences" className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
					Open Sequences
				</Link>
				<a href="https://example.com" target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
					Learn More
				</a>
			</div>
		</div>
	)
} 