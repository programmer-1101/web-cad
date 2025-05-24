// src/simulation/simulator.ts
import { CircuitComponent, Wire, SubCircuit } from '../types/types'; // Import SubCircuit
import { create, all } from 'mathjs';

const math = create(all);

type Node = string;

interface NodeMap {
  [key: string]: number; // voltage at node (simulated result)
}

interface ComponentCurrents {
  [componentId: string]: number;
}

export function simulateCircuit(
  components: CircuitComponent[],
  wires: Wire[],
  subcircuits: SubCircuit[] // New parameter for subcircuit definitions
): {
  nodeVoltages: NodeMap;
  componentCurrents: ComponentCurrents;
  error?: string;
} {
  if (components.length === 0) {
    return { nodeVoltages: {}, componentCurrents: {} };
  }

  // --- Step 1: Flatten Subcircuits ---
  // Create new arrays for the expanded components and wires that will be simulated
  let expandedComponents: CircuitComponent[] = [];
  let expandedWires: Wire[] = [];

  // A map to track the mapping from subcircuit internal terminals to global component terminals
  // For example: { 'subcircuit_instance_id_in1': { componentId: 'main_comp_id_123', terminal: 0 } }
  const subcircuitTerminalToGlobalTerminalMap = new Map<string, { componentId: string; terminal: number }>();

  // Helper to generate unique IDs for expanded components
  let componentIdCounter = 0;
  const generateExpandedId = () => `expanded_comp_${componentIdCounter++}`;

  components.forEach(comp => {
    if (comp.type === 'subcircuit' && comp.subcircuitId) {
      const subcircuitDef = subcircuits.find(s => s.id === comp.subcircuitId);
      if (!subcircuitDef) {
        console.warn(`Subcircuit definition not found for ID: ${comp.subcircuitId}`);
        return; // Skip invalid subcircuit
      }

      // Generate a prefix for all internal components of this subcircuit instance
      // to ensure their IDs are unique in the flattened circuit
      const instancePrefix = `${comp.id}_`;

      // Expand internal components
      subcircuitDef.internalComponents.forEach(internalComp => {
        expandedComponents.push({
          ...internalComp,
          id: `${instancePrefix}${internalComp.id}`, // Make ID unique to this instance
          // Adjust x, y relative to the subcircuit instance's position
          x: comp.x + internalComp.x,
          y: comp.y + internalComp.y,
        });
      });

      // Expand internal wires
      subcircuitDef.internalWires.forEach(internalWire => {
        expandedWires.push({
          ...internalWire,
          id: `${instancePrefix}${internalWire.id}`, // Make ID unique to this instance
          from: { componentId: `${instancePrefix}${internalWire.from.componentId}`, terminal: internalWire.from.terminal },
          to: { componentId: `${instancePrefix}${internalWire.to.componentId}`, terminal: internalWire.to.terminal },
        });
      });

      // Now, crucially, map the subcircuit's external terminals to its internal components' terminals.
      // This part is highly dependent on how you define and connect terminals within your subcircuit creation.
      // For a proper solution, you'd need the subcircuit definition to store *which internal terminal*
      // corresponds to each external input/output.
      // E.g., a subcircuit input 'in1' might connect to internalComponent 'R1' terminal 0.
      // We'll use a placeholder for now, assuming a simple mapping for demonstration.
      // This is the most complex part of subcircuit integration.
      // The `terminalMap` on `CircuitComponent` was intended for this, but its exact population
      // during subcircuit placement (drag & drop) needs careful thought.
      // For this example, let's assume `subcircuitDef.inputs[i]` maps to the `i`-th internal component's terminal 0
      // that is "connected" to it, and similarly for outputs.
      // THIS WILL NEED TO BE MADE MORE ROBUST IN A REAL APP.
      if (comp.terminalMap) {
        Object.entries(comp.terminalMap).forEach(([subCircuitTermId, globalTerminalRef]) => {
            subcircuitTerminalToGlobalTerminalMap.set(`${comp.id}_${subCircuitTermId}`, globalTerminalRef);
        });
      }


    } else {
      // Add regular components directly to the expanded list
      expandedComponents.push(comp);
    }
  });

  // Add all original wires to the expanded list, and adjust if they connect to subcircuit instances
  wires.forEach(wire => {
      // This part needs careful handling: if a wire connects to a subcircuit instance,
      // it actually connects to an internal terminal of that subcircuit.
      // The `subcircuitTerminalToGlobalTerminalMap` would be used here.
      // For simplicity, this example skips detailed internal re-wiring of external connections.
      // A full solution would use the `terminalMap` on the subcircuit instance (`comp.terminalMap`)
      // to resolve global wires to internal subcircuit nodes.
      expandedWires.push(wire);
  });


  // --- Start of existing simulation logic, using expandedComponents and expandedWires ---

  // Union-Find data structure for node connections
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
  let groundNode: Node | null = null;

  // Establish initial nodes for each component terminal
  expandedComponents.forEach(comp => {
    uf.find(`${comp.id}_0`); // Terminal 0
    uf.find(`${comp.id}_1`); // Terminal 1
  });

  // Union nodes connected by wires
  expandedWires.forEach(wire => {
    uf.union(`${wire.from.componentId}_${wire.from.terminal}`, `${wire.to.componentId}_${wire.to.terminal}`);
  });

  // Find voltage sources and set one terminal as ground if available
  expandedComponents.forEach(comp => {
    if (comp.type === 'voltage' && groundNode === null) {
      // Prioritize setting the negative terminal of the first voltage source as ground
      groundNode = uf.find(`${comp.id}_1`); // Assuming terminal 1 is negative for voltage sources
    }
  });

  // If no voltage source for ground, pick an arbitrary node (e.g., the first component's terminal 0)
  if (groundNode === null && expandedComponents.length > 0) {
    groundNode = uf.find(`${expandedComponents[0].id}_0`);
  } else if (groundNode === null) {
      // No components to simulate, return empty results
      return { nodeVoltages: {}, componentCurrents: {} };
  }


  // Map unique root nodes to matrix indices
  const uniqueNodes = new Set<Node>();
  expandedComponents.forEach(comp => {
    uniqueNodes.add(uf.find(`${comp.id}_0`));
    uniqueNodes.add(uf.find(`${comp.id}_1`));
  });

  // Remove ground node from unique nodes if it's present
  if (groundNode) {
    uniqueNodes.delete(groundNode);
  }

  const nodeIndexMap = new Map<Node, number>();
  let matrixSize = 0;
  uniqueNodes.forEach(node => {
    nodeIndexMap.set(node, matrixSize++);
  });

  // Initialize G matrix and I vector
  let G = math.zeros([matrixSize, matrixSize]) as math.Matrix;
  let I = math.zeros([matrixSize, 1]) as math.Matrix;

  // Build G matrix and I vector for resistors
  expandedComponents.forEach(comp => {
    if (comp.type === 'resistor') {
      const conductance = 1 / comp.value;
      const nodeA = uf.find(`${comp.id}_0`);
      const nodeB = uf.find(`${comp.id}_1`);

      const idxA = nodeIndexMap.get(nodeA);
      const idxB = nodeIndexMap.get(nodeB);

      if (nodeA !== groundNode && nodeB !== groundNode) {
        // Both nodes are non-ground
        G = G.set([idxA!, idxA!], G.get([idxA!, idxA!]) + conductance);
        G = G.set([idxB!, idxB!], G.get([idxB!, idxB!]) + conductance);
        G = G.set([idxA!, idxB!], G.get([idxA!, idxB!]) - conductance);
        G = G.set([idxB!, idxA!], G.get([idxB!, idxA!]) - conductance);
      } else if (nodeA !== groundNode) {
        // Node A is non-ground, Node B is ground
        G = G.set([idxA!, idxA!], G.get([idxA!, idxA!]) + conductance);
      } else if (nodeB !== groundNode) {
        // Node B is non-ground, Node A is ground
        G = G.set([idxB!, idxB!], G.get([idxB!, idxB!]) + conductance);
      }
    } else if (comp.type === 'voltage') {
      // Simplified voltage source handling (one terminal grounded)
      // This will set the non-grounded node's voltage directly.
      const nodeP = uf.find(`${comp.id}_0`); // Positive terminal
      const nodeN = uf.find(`${comp.id}_1`); // Negative terminal

      let targetNode: Node | null = null;
      let voltage = comp.value;

      if (nodeP === groundNode) {
        targetNode = nodeN;
        voltage = -comp.value; // If positive is ground, negative is -V
      } else if (nodeN === groundNode) {
        targetNode = nodeP;
      } else {
        // Floating voltage source not directly supported by this simplified MNA
        // For a full MNA, you'd add an extra row/column for the voltage source current.
        // For now, we'll effectively ignore it if both are floating or error out.
        // As per initial MNA notes, we assume one terminal is tied to ground.
        console.warn(`Floating voltage source ${comp.id} cannot be fully simulated with this simplified MNA. One terminal should be connected to ground.`);
        return {
            nodeVoltages: {},
            componentCurrents: {},
            error: `Floating voltage source ${comp.id} is not fully supported by this simulator version.`
        };
      }

      if (targetNode && targetNode !== groundNode) {
          const idx = nodeIndexMap.get(targetNode);
          if (idx !== undefined) {
              // Set the row for this node to identity-like and current to voltage value
              for (let col = 0; col < matrixSize; col++) {
                  G = G.set([idx, col], 0);
              }
              G = G.set([idx, idx], 1); // Set diagonal to 1
              I = I.set([idx, 0], voltage);
          }
      }
    }
    // Add logic for other components (capacitors, inductors for AC/transient)
  });

  let V: math.Matrix;
  let componentCurrents: ComponentCurrents = {};

  try {
    // Solve for node voltages
    V = math.lusolve(G, I) as math.Matrix;
  } catch (e) {
    console.error("Simulation error:", e);
    return {
      nodeVoltages: {},
      componentCurrents: {},
      error: "Failed to solve circuit. Check for invalid configurations or isolated components."
    };
  }

  // Calculate component currents for expanded components
  expandedComponents.forEach(comp => {
    if (comp.type === 'resistor') {
      const nodeA = uf.find(`${comp.id}_0`);
      const nodeB = uf.find(`${comp.id}_1`);

      const vA = nodeA === groundNode ? 0 : (V as any)[nodeIndexMap.get(nodeA)!][0];
      const vB = nodeB === groundNode ? 0 : (V as any)[nodeIndexMap.get(nodeB)!][0];

      // Current from A to B
      componentCurrents[comp.id] = (vA - vB) / comp.value;
    } else if (comp.type === 'voltage') {
      // For voltage sources, calculating current is more complex
      // and usually involves adding a KCL equation for the current
      // through the voltage source in Modified Nodal Analysis (MNA).
      // For a simplified approach, we might just set it to 0 or calculate later
      // if an independent current source is present.
      componentCurrents[comp.id] = 0; // Placeholder for now, needs proper MNA extension
    }
    // Add current calculations for other components as needed (e.g., current through diode)
  });

  // Prepare results for node voltages
  const nodeVoltages: NodeMap = {};
  nodeVoltages[groundNode!] = 0; // Ground node is 0V

  uniqueNodes.forEach(node => {
    const idx = nodeIndexMap.get(node);
    if (idx !== undefined) {
      nodeVoltages[node] = (V as any)[idx][0];
    }
  });


  return { nodeVoltages, componentCurrents };
}