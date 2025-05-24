// src/types/types.ts
export type ComponentType = 'resistor' | 'capacitor' | 'inductor' | 'voltage' | 'diode' | 'transistor' | 'bulb' | 'subcircuit';

export interface Terminal {
  id: string; // A unique identifier for the terminal within the subcircuit context
  name: string; // e.g., "Input A", "Output Z"
  x: number; // relative x position within the subcircuit's bounding box
  y: number; // relative y position within the subcircuit's bounding box
  // This helps visually place connection points on the subcircuit's rendered shape
  // For simplicity, we can use relative positions (0-1 for normalized, or pixels)
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  value: number; // For basic components
  rotation?: number;
  // For subcircuits, this will store internal components and wires, and terminal mappings
  subcircuitId?: string; // Links to a defined SubCircuit blueprint
  terminalMap?: { [subCircuitTerminalId: string]: { componentId: string; terminal: number } };
}

export interface Wire {
  id: string;
  from: { componentId: string; terminal: number };
  to: { componentId: string; terminal: number };
}

export interface SubCircuit {
  id: string; // Unique ID for the subcircuit definition (e.g., "AND_GATE_1")
  name: string; // Display name (e.g., "AND Gate")
  internalComponents: CircuitComponent[];
  internalWires: Wire[];
  inputs: Terminal[]; // Terminals exposed as inputs
  outputs: Terminal[]; // Terminals exposed as outputs
  width: number; // Bounding box for rendering
  height: number; // Bounding box for rendering
}

export type ToolMode = 'select' | 'add' | 'wire' | 'subcircuit_create'; // Added subcircuit_create