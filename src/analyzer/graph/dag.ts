/**
 * Directed Acyclic Graph (DAG) of Bubble app dependencies.
 * Nodes represent elements, workflows, fields, plugins, option sets, styles.
 * Edges represent references between them.
 */

export type NodeKind =
  | 'page'
  | 'element'
  | 'workflow'
  | 'api_workflow'
  | 'data_type'
  | 'field'
  | 'option_set'
  | 'style'
  | 'plugin'
  | 'reusable_element';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'references' | 'triggers' | 'contains' | 'styles';
}

export class DependencyGraph {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private incomingEdges = new Map<string, Set<string>>();
  private outgoingEdges = new Map<string, Set<string>>();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.incomingEdges.has(node.id)) {
      this.incomingEdges.set(node.id, new Set());
    }
    if (!this.outgoingEdges.has(node.id)) {
      this.outgoingEdges.set(node.id, new Set());
    }
  }

  addEdge(edge: GraphEdge): void {
    // Only add edge if both nodes exist
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) return;
    if (edge.from === edge.to) return; // no self-loops

    this.edges.push(edge);
    this.outgoingEdges.get(edge.from)!.add(edge.to);
    this.incomingEdges.get(edge.to)!.add(edge.from);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  getNodesByKind(kind: NodeKind): GraphNode[] {
    return [...this.nodes.values()].filter((n) => n.kind === kind);
  }

  getIncomingCount(id: string): number {
    return this.incomingEdges.get(id)?.size ?? 0;
  }

  getOutgoingCount(id: string): number {
    return this.outgoingEdges.get(id)?.size ?? 0;
  }

  getIncomingNodes(id: string): GraphNode[] {
    const ids = this.incomingEdges.get(id) ?? new Set();
    return [...ids]
      .map((i) => this.nodes.get(i))
      .filter(Boolean) as GraphNode[];
  }

  getOutgoingNodes(id: string): GraphNode[] {
    const ids = this.outgoingEdges.get(id) ?? new Set();
    return [...ids]
      .map((i) => this.nodes.get(i))
      .filter(Boolean) as GraphNode[];
  }

  /**
   * Returns all nodes with zero incoming edges (orphans / dead code candidates)
   */
  getOrphanNodes(kind?: NodeKind): GraphNode[] {
    return [...this.nodes.values()].filter((node) => {
      if (kind && node.kind !== kind) return false;
      return (this.incomingEdges.get(node.id)?.size ?? 0) === 0;
    });
  }

  getEdgeCount(): number {
    return this.edges.length;
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  /** Returns stats for reporting */
  getStats(): GraphStats {
    const byKind: Partial<Record<NodeKind, number>> = {};
    for (const node of this.nodes.values()) {
      byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
    }
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      byKind: byKind as Record<NodeKind, number>,
    };
  }
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  byKind: Record<NodeKind, number>;
}
