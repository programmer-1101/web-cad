export type ComponentType = 
  | 'resistor' 
  | 'voltage' 
  | 'capacitor' 
  | 'inductor' 
  | 'diode'
  | 'transistor'
  | 'bulb'
  | 'logic-gate';

export type LogicGateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';
export type TransistorType = 'NPN' | 'PNP' | 'MOSFET';
export type ToolMode = 'add' | 'select';

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  value: number;
  subtype?: LogicGateType | TransistorType;
  rotation?: number;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromNode: number;
  toComponentId: string;
  toNode: number;
}

export interface SimulationResult {
  nodeVoltages: { [node: string]: number };
  componentCurrents: { [componentId: string]: number };
  error?: string;
}