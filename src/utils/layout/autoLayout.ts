import type { Node, Edge } from '@xyflow/react'

export interface LayoutOptions {
  nodeWidth: number
  nodeHeight: number
  horizontalSpacing: number
  verticalSpacing: number
  startX: number
  startY: number
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalSpacing: 150,
  verticalSpacing: 100,
  startX: 100,
  startY: 100,
}

/**
 * Simple hierarchical layout algorithm that arranges nodes in a tree-like structure
 */
export function autoLayout<T extends Record<string, unknown> = any>(nodes: Node<T>[], edges: Edge[], options: Partial<LayoutOptions> = {}): Node<T>[] {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options }
  
  if (nodes.length === 0) return nodes

  // Build adjacency map for the graph
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  
  edges.forEach(edge => {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, [])
    if (!incoming.has(edge.target)) incoming.set(edge.target, [])
    
    outgoing.get(edge.source)!.push(edge.target)
    incoming.get(edge.target)!.push(edge.source)
  })

  // Find root nodes (nodes with no incoming edges)
  const rootNodes = nodes.filter(node => !incoming.has(node.id) || incoming.get(node.id)!.length === 0)
  
  if (rootNodes.length === 0) {
    // If no clear root, use simple grid layout
    return gridLayout(nodes, opts)
  }

  // Position nodes level by level
  const positioned = new Map<string, { x: number; y: number }>()
  const visited = new Set<string>()
  const levels: string[][] = []
  
  // BFS to determine levels
  const queue: { nodeId: string; level: number }[] = rootNodes.map(node => ({ nodeId: node.id, level: 0 }))
  
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!
    
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    
    if (!levels[level]) levels[level] = []
    levels[level].push(nodeId)
    
    // Add children to next level
    const children = outgoing.get(nodeId) || []
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ nodeId: childId, level: level + 1 })
      }
    })
  }

  // Position nodes by level
  levels.forEach((levelNodes, levelIndex) => {
    const levelY = opts.startY + levelIndex * (opts.nodeHeight + opts.verticalSpacing)
    
    // Center nodes horizontally within the level
    const totalWidth = levelNodes.length * opts.nodeWidth + (levelNodes.length - 1) * opts.horizontalSpacing
    const startX = opts.startX - totalWidth / 2 + opts.nodeWidth / 2
    
    levelNodes.forEach((nodeId, nodeIndex) => {
      const x = startX + nodeIndex * (opts.nodeWidth + opts.horizontalSpacing)
      positioned.set(nodeId, { x, y: levelY })
    })
  })

  // Apply positions to nodes
  return nodes.map(node => {
    const pos = positioned.get(node.id)
    if (pos) {
      return { ...node, position: pos }
    }
    return node
  })
}

/**
 * Simple grid layout for graphs without clear hierarchy
 */
function gridLayout<T extends Record<string, unknown> = any>(nodes: Node<T>[], opts: LayoutOptions): Node<T>[] {
  const nodesPerRow = Math.ceil(Math.sqrt(nodes.length))
  
  return nodes.map((node, index) => {
    const row = Math.floor(index / nodesPerRow)
    const col = index % nodesPerRow
    
    const x = opts.startX + col * (opts.nodeWidth + opts.horizontalSpacing)
    const y = opts.startY + row * (opts.nodeHeight + opts.verticalSpacing)
    
    return { ...node, position: { x, y } }
  })
}

/**
 * Detect if nodes are too close together and need auto-layout
 */
export function shouldAutoLayout<T extends Record<string, unknown> = any>(nodes: Node<T>[], threshold: number = 50): boolean {
  if (nodes.length < 2) return false
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i]
      const node2 = nodes[j]
      
      const distance = Math.sqrt(
        Math.pow(node1.position.x - node2.position.x, 2) + 
        Math.pow(node1.position.y - node2.position.y, 2)
      )
      
      if (distance < threshold) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Get bounding box of all nodes
 */
export function getNodesBounds<T extends Record<string, unknown> = any>(nodes: Node<T>[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + 200) // Assume node width ~200
    maxY = Math.max(maxY, node.position.y + 80)  // Assume node height ~80
  })
  
  return { minX, minY, maxX, maxY }
}
