export default function Triggers() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
			{/* Construction Icon */}
			<div className="mb-8">
				<svg 
					className="w-24 h-24 text-orange-400 mx-auto" 
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24" 
					xmlns="http://www.w3.org/2000/svg"
				>
					<path 
						strokeLinecap="round" 
						strokeLinejoin="round" 
						strokeWidth={1.5} 
						d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
					/>
				</svg>
			</div>
			
			{/* Under Construction Text */}
			<h2 className="text-3xl font-bold text-slate-900 mb-4">
				Triggers - Under Construction
			</h2>
			
			<p className="text-lg text-slate-600 mb-2 max-w-md">
				We're working hard to bring you an amazing triggers management experience.
			</p>
			
			<p className="text-sm text-slate-500">
				This feature will allow you to manage events that kick off your sequences.
			</p>
			
			{/* Decorative Elements */}
			<div className="mt-8 flex space-x-2">
				<div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
				<div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
				<div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
			</div>
		</div>
	)
} 