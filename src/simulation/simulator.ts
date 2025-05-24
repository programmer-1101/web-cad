import { CircuitComponent, Wire, SimulationResult } from '../models/types';
import { create, all, MathNode } from 'mathjs';

const math = create(all);

export function simulateCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): SimulationResult {
  if (components.length === 0) {
    return { nodeVoltages: {}, componentCurrents: {} };
  }

  // Step 1: Identify nodes using Union-Find
  class UnionFind {
    parent: Map<string, string>;
    constructor() {
      this.parent = new Map();
    }
    find(x: string): string {
      if (!this.parent.has(x)) this.parent.set(x, x);
      if (this.parent.get(x) !== x) {
        this.parent.set(x, this.find(this.parent.get(x)!));
      }
      return this.parent.get(x)!;
    }
    union(a: string, b: string) {
      const rootA = this.find(a);
      const rootB = this.find(b);
      if (rootA !== rootB) {
        this.parent.set(rootB, rootA);
      }
    }
  }

  const uf = new UnionFind();
  const terminalToNode = new Map<string, string>();

  // Process wires to connect terminals
  for (const wire of wires) {
    const t1 = `${wire.fromComponentId}_${wire.fromNode}`;
    const t2 = `${wire.toComponentId}_${wire.toNode}`;
    uf.union(t1, t2);
  }

  // Map all terminals to nodes
  for (const comp of components) {
    for (let node = 0; node <= 1; node++) {
      const terminalId = `${comp.id}_${node}`;
      const nodeId = uf.find(terminalId);
      terminalToNode.set(terminalId, nodeId);
    }
  }

  // Get unique nodes and assign ground
  const uniqueNodes = Array.from(new Set(terminalToNode.values()));
  if (uniqueNodes.length === 0) {
    return { nodeVoltages: {}, componentCurrents: {} };
  }

  // Select ground node (prioritize voltage source negative terminal)
  let groundNode = uniqueNodes[0];
  const voltageSources = components.filter(c => c.type === 'voltage');
  if (voltageSources.length > 0) {
    groundNode = terminalToNode.get(`${voltageSources[0].id}_0`) || groundNode;
  }

  // Assign matrix indices (skip ground node)
  const nodeIndexMap = new Map<string, number>();
  let idx = 0;
  for (const node of uniqueNodes) {
    if (node !== groundNode) {
      nodeIndexMap.set(node, idx);
      idx++;
    }
  }
  const N = nodeIndexMap.size;

  // Initialize matrices
  let G = math.zeros(N, N) as math.Matrix;
  let I = math.zeros(N) as math.Matrix;
  const componentCurrents: { [id: string]: number } = {};

  // Process resistors
  for (const comp of components) {
    if (comp.type !== 'resistor') continue;
    
    const nodeA = terminalToNode.get(`${comp.id}_0`)!;
    const nodeB = terminalToNode.get(`${comp.id}_1`)!;
    const g = 1 / comp.value;

    const i = nodeIndexMap.get(nodeA);
    const j = nodeIndexMap.get(nodeB);

    if (i !== undefined) G.set([i, i], (G.get([i, i]) as number) + g);
    if (j !== undefined) G.set([j, j], (G.get([j, j]) as number) + g);
    if (i !== undefined && j !== undefined) {
      G.set([i, j], (G.get([i, j]) as number) - g);
      G.set([j, i], (G.get([j, i]) as number) - g);
    }
  }

  // Process voltage sources
  for (const vsrc of voltageSources) {
    const posNode = terminalToNode.get(`${vsrc.id}_1`)!;
    const negNode = terminalToNode.get(`${vsrc.id}_0`)!;

    if (negNode === groundNode) {
      const i = nodeIndexMap.get(posNode);
      if (i !== undefined) {
        for (let col = 0; col < N; col++) G.set([i, col], 0);
        G.set([i, i], 1);
        I.set([i], vsrc.value);
      }
    } else if (posNode === groundNode) {
      const i = nodeIndexMap.get(negNode);
      if (i !== undefined) {
        for (let col = 0; col < N; col++) G.set([i, col], 0);
        G.set([i, i], 1);
        I.set([i], -vsrc.value);
      }
    }
  }

  // Solve the circuit
  let V: math.MathArray;
  try {
    const result = math.lusolve(G, I);
    V = result.toArray() as math.MathArray;
  } catch (error) {
    console.error("Simulation error:", error);
    return { 
      nodeVoltages: {}, 
      componentCurrents: {}, 
      error: "Failed to solve circuit. Check for invalid configurations." 
    };
  }

  // Calculate component currents
  for (const comp of components) {
    if (comp.type === 'resistor') {
      const nodeA = terminalToNode.get(`${comp.id}_0`)!;
      const nodeB = terminalToNode.get(`${comp.id}_1`)!;
      
      const vA = nodeA === groundNode ? 0 : (V as any)[nodeIndexMap.get(nodeA)!][0];
      const vB = nodeB === groundNode ? 0 : (V as any)[nodeIndexMap.get(nodeB)!][0];
      
      componentCurrents[comp.id] = (vA - vB) / comp.value;
    } else if (comp.type === 'voltage') {
      componentCurrents[comp.id] = 0; // Simplified - would need to calculate from modified nodal analysis
    }
  }

  // Prepare results
  const nodeVoltages: { [node: string]: number } = {};
  nodeVoltages[groundNode] = 0;
  for (const [node, index] of nodeIndexMap.entries()) {
    nodeVoltages[node] = (V as any)[index][0];
  }

  return { nodeVoltages, componentCurrents };
}