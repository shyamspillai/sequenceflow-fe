export default function Usage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
			{/* Construction Icon */}
			<div className="mb-8">
				<svg 
					className="w-24 h-24 text-blue-500 mx-auto" 
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24" 
					xmlns="http://www.w3.org/2000/svg"
				>
					<path 
						strokeLinecap="round" 
						strokeLinejoin="round" 
						strokeWidth={1.5} 
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
			</div>
			
			{/* Under Construction Text */}
			<h2 className="text-3xl font-bold text-slate-900 mb-4">
				Usage Analytics - Under Construction
			</h2>
			
			<p className="text-lg text-slate-600 mb-2 max-w-md">
				We're building comprehensive analytics and usage tracking for your workflows.
			</p>
			
			<p className="text-sm text-slate-500">
				This feature will help you track executions, quotas, and performance metrics.
			</p>
			
			{/* Decorative Elements */}
			<div className="mt-8 flex space-x-2">
				<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
				<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
				<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
			</div>
		</div>
	)
} 