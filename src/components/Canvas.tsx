// src/components/Canvas.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CircuitComponent, Wire, ToolMode, ComponentType, SubCircuit } from '../types/types';

import { GRID_SIZE, COMPONENT_SIZE } from '../constants';

interface CanvasProps {
  components: CircuitComponent[];
  setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  wires: Wire[];
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
  selectedTool: ToolMode;
  selectedComponentType: ComponentType;
  onDropComponent: (e: React.DragEvent) => void; // New prop for handling drops
  draggedComponentType: ComponentType | null; // For visual feedback during drag
  subcircuits: SubCircuit[]; // Pass subcircuits to resolve their definitions
}

const Canvas: React.FC<CanvasProps> = ({
  components,
  setComponents,
  wires,
  setWires,
  selectedTool,
  selectedComponentType,
  onDropComponent, // Destructure new prop
  draggedComponentType, // Destructure new prop
  subcircuits, // Destructure new prop
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [wireStart, setWireStart] = useState<{ componentId: string; terminal: number } | null>(null);
  const [currentWire, setCurrentWire] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Helper function to snap coordinates to the grid
  const snapToGrid = (coord: number) => Math.round(coord / GRID_SIZE) * GRID_SIZE;

  // Drag and Drop handlers for the canvas itself
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDropComponent(e); // Delegate the drop handling to App.tsx
  }, [onDropComponent]);


  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!svgRef.current || selectedTool !== 'add') return;

    // This part is now mostly handled by drag and drop,
    // but we can keep it for direct click placement if desired.
    // If you want only drag & drop, you can remove this block.
    // For now, let's keep it to support both.
    const rect = svgRef.current.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left - COMPONENT_SIZE / 2);
    const y = snapToGrid(e.clientY - rect.top - COMPONENT_SIZE / 2);

    const newComponent: CircuitComponent = {
      id: Date.now().toString(),
      type: selectedComponentType,
      x,
      y,
      value: getDefaultValue(selectedComponentType), // Call local getDefaultValue
    };

    if (selectedComponentType === 'subcircuit') {
      // If adding a subcircuit by click, you'd need to prompt for which subcircuit
      // This is less intuitive than drag and drop for subcircuits.
      alert("Please drag and drop subcircuits from the toolbar.");
      return;
    }

    setComponents([...components, newComponent]);
  };

  const handleComponentMouseDown = (e: React.MouseEvent, component: CircuitComponent) => {
    e.stopPropagation(); // Prevent canvas click
    if (!svgRef.current) return; // Ensure svgRef is available

    const svgRect = svgRef.current.getBoundingClientRect();

    if (selectedTool === 'wire') {
      // Pass e.nativeEvent to getNearestTerminal
      const terminal = getNearestTerminal(e.nativeEvent, component, svgRect, subcircuits);
      setWireStart({ componentId: component.id, terminal });
      setCurrentWire({
        x1: component.x + getTerminalGlobalX(component, terminal, subcircuits), // Get exact terminal global X
        y1: component.y + getTerminalGlobalY(component, terminal, subcircuits), // Get exact terminal global Y
        x2: e.clientX - svgRect.left,
        y2: e.clientY - svgRect.top,
      });
    } else if (selectedTool === 'select') {
      setDragging(component.id);
      // set selectedItem in App.tsx (you'd need to pass setSelectedItem as a prop)
      // For now, let's assume selectedItem is handled by App based on click
    }
  };

  const handleCanvasMouseMove = useCallback(
    (e: MouseEvent) => { // Changed to MouseEvent
      if (!svgRef.current) return; // Ensure svgRef is available

      const rect = svgRef.current.getBoundingClientRect();

      if (dragging) {
        const x = snapToGrid(e.clientX - rect.left - COMPONENT_SIZE / 2);
        const y = snapToGrid(e.clientY - rect.top - COMPONENT_SIZE / 2);
        setComponents((prev) =>
          prev.map((c) => (c.id === dragging ? { ...c, x, y } : c))
        );
      } else if (wireStart) {
        const startComponent = components.find((c) => c.id === wireStart.componentId);
        if (!startComponent) return;

        setCurrentWire({
          x1: startComponent.x + getTerminalGlobalX(startComponent, wireStart.terminal, subcircuits),
          y1: startComponent.y + getTerminalGlobalY(startComponent, wireStart.terminal, subcircuits),
          x2: e.clientX - rect.left,
          y2: e.clientY - rect.top,
        });
      }
    },
    [dragging, setComponents, wireStart, components, subcircuits] // Added subcircuits to dependencies
  );

  const handleCanvasMouseUp = useCallback(
    (e: MouseEvent) => { // Changed to MouseEvent
      e.stopPropagation();
      if (!svgRef.current) return; // Ensure svgRef is available

      const svgRect = svgRef.current.getBoundingClientRect();

      if (dragging) {
        setDragging(null);
      } else if (wireStart) {
        const endComponent = components.find((c) =>
          isPointInsideComponent(
            e.clientX - svgRect.left,
            e.clientY - svgRect.top,
            c,
            subcircuits // Pass subcircuits to check proper bounds
          )
        );
        if (endComponent && endComponent.id !== wireStart.componentId) { // Prevent self-wiring
          const terminal = getNearestTerminal(e, endComponent, svgRect, subcircuits);
          const newWire: Wire = {
            id: Date.now().toString(),
            from: { componentId: wireStart.componentId, terminal: wireStart.terminal },
            to: { componentId: endComponent.id, terminal },
          };
          setWires((prev) => [...prev, newWire]);
        }
        setWireStart(null);
        setCurrentWire(null);
      }
    },
    [dragging, wireStart, wires, setWires, components, subcircuits] // Added subcircuits to dependencies
  );

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.addEventListener('mousemove', handleCanvasMouseMove);
      svgRef.current.addEventListener('mouseup', handleCanvasMouseUp);
    }
    return () => {
      if (svgRef.current) {
        svgRef.current.removeEventListener('mousemove', handleCanvasMouseMove);
        svgRef.current.removeEventListener('mouseup', handleCanvasMouseUp);
      }
    };
  }, [handleCanvasMouseMove, handleCanvasMouseUp]);

  // Helper to get default value (now App.tsx manages this, but Canvas might need it if 'add' tool is kept)
  const getDefaultValue = (type: ComponentType): number => {
    const defaults = {
      resistor: 100,
      capacitor: 0.000001,
      inductor: 0.001,
      voltage: 5,
      diode: 0.7,
      transistor: 0,
      bulb: 0,
      subcircuit: 0,
    };
    return defaults[type];
  };

  const getTerminalGlobalX = (component: CircuitComponent, terminalId: number, subcircuits: SubCircuit[]): number => {
    if (component.type === 'subcircuit' && component.subcircuitId) {
      const subcircuitDef = subcircuits.find(s => s.id === component.subcircuitId);
      if (subcircuitDef) {
        // Find the terminal definition by its internal ID (which we are passing as `terminalId`)
        const terminal = [...subcircuitDef.inputs, ...subcircuitDef.outputs].find((t, index) => index === terminalId);
        if (terminal) {
          return terminal.x; // Terminal X is relative to subcircuit's top-left
        }
      }
    }
    // Default for basic components (center)
    return COMPONENT_SIZE / 2;
  };

  const getTerminalGlobalY = (component: CircuitComponent, terminalId: number, subcircuits: SubCircuit[]): number => {
    if (component.type === 'subcircuit' && component.subcircuitId) {
      const subcircuitDef = subcircuits.find(s => s.id === component.subcircuitId);
      if (subcircuitDef) {
        const terminal = [...subcircuitDef.inputs, ...subcircuitDef.outputs].find((t, index) => index === terminalId);
        if (terminal) {
          return terminal.y; // Terminal Y is relative to subcircuit's top-left
        }
      }
    }
    // Default for basic components (center)
    return COMPONENT_SIZE / 2;
  };

  const renderComponent = (component: CircuitComponent) => {
    // Determine actual component size for rendering if it's a subcircuit
    let actualWidth = COMPONENT_SIZE;
    let actualHeight = COMPONENT_SIZE;
    let subcircuitTerminals: { x: number; y: number; id: string }[] = [];

    if (component.type === 'subcircuit' && component.subcircuitId) {
      const subcircuitDef = subcircuits.find(s => s.id === component.subcircuitId);
      if (subcircuitDef) {
        actualWidth = subcircuitDef.width;
        actualHeight = subcircuitDef.height;
        // Collect terminal positions relative to subcircuit's origin
        subcircuitTerminals = [
          ...subcircuitDef.inputs.map(t => ({ x: t.x, y: t.y, id: t.id })),
          ...subcircuitDef.outputs.map(t => ({ x: t.x, y: t.y, id: t.id }))
        ];
      }
    }

    return (
      <g
        key={component.id}
        transform={`translate(${component.x}, ${component.y})`}
        onMouseDown={(e) => handleComponentMouseDown(e, component)}
      >
        {/* Render unique shapes based on component type */}
        {component.type === 'resistor' && (
          <>
            <path
              d="M0,10 h10 l5,-10 l10,20 l10,-20 l5,10 h10"
              stroke="black"
              strokeWidth="2"
              fill="none"
              transform={`scale(${COMPONENT_SIZE / 40})`} // Scale path to fit COMPONENT_SIZE
            />
            <text
              x={COMPONENT_SIZE / 2}
              y={COMPONENT_SIZE / 2 + 5}
              textAnchor="middle"
              fontSize="10"
              fill="black"
            >
              {component.value}Ω
            </text>
          </>
        )}
        {component.type === 'voltage' && (
          <>
            <circle cx={COMPONENT_SIZE / 2} cy={COMPONENT_SIZE / 2} r={COMPONENT_SIZE / 2 - 5} stroke="black" strokeWidth="2" fill="white" />
            <line x1={COMPONENT_SIZE / 2} y1={10} x2={COMPONENT_SIZE / 2} y2={20} stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2} y1={COMPONENT_SIZE - 20} x2={COMPONENT_SIZE / 2} y2={COMPONENT_SIZE - 10} stroke="black" strokeWidth="2" />
            <text
              x={COMPONENT_SIZE / 2}
              y={COMPONENT_SIZE / 2 + 5}
              textAnchor="middle"
              fontSize="10"
              fill="black"
            >
              {component.value}V
            </text>
          </>
        )}
        {component.type === 'capacitor' && (
          <>
            <line x1={10} y1={COMPONENT_SIZE / 2} x2={COMPONENT_SIZE / 2 - 5} y2={COMPONENT_SIZE / 2} stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2 + 5} y1={COMPONENT_SIZE / 2} x2={COMPONENT_SIZE - 10} y2={COMPONENT_SIZE / 2} stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2 - 5} y1={10} x2={COMPONENT_SIZE / 2 - 5} y2={COMPONENT_SIZE - 10} stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2 + 5} y1={10} x2={COMPONENT_SIZE / 2 + 5} y2={COMPONENT_SIZE - 10} stroke="black" strokeWidth="2" />
            <text
              x={COMPONENT_SIZE / 2}
              y={COMPONENT_SIZE / 2 + 5}
              textAnchor="middle"
              fontSize="10"
              fill="black"
            >
              {component.value}F
            </text>
          </>
        )}
        {component.type === 'inductor' && (
          <>
            <path
              d={`M5,${COMPONENT_SIZE / 2} C15,${COMPONENT_SIZE / 2 - 15} 25,${COMPONENT_SIZE / 2 + 15} ${COMPONENT_SIZE / 2},${COMPONENT_SIZE / 2} C${COMPONENT_SIZE / 2 + 10},${COMPONENT_SIZE / 2 - 15} ${COMPONENT_SIZE - 15},${COMPONENT_SIZE / 2 + 15} ${COMPONENT_SIZE - 5},${COMPONENT_SIZE / 2}`}
              stroke="black"
              strokeWidth="2"
              fill="none"
            />
            <text
              x={COMPONENT_SIZE / 2}
              y={COMPONENT_SIZE / 2 + 5}
              textAnchor="middle"
              fontSize="10"
              fill="black"
            >
              {component.value}H
            </text>
          </>
        )}
        {component.type === 'diode' && (
          <>
            <line x1={10} y1={COMPONENT_SIZE / 2} x2={COMPONENT_SIZE / 2 - 5} y2={COMPONENT_SIZE / 2} stroke="black" strokeWidth="2" />
            <path d={`M${COMPONENT_SIZE / 2 - 5},10 L${COMPONENT_SIZE / 2 + 15},${COMPONENT_SIZE / 2} L${COMPONENT_SIZE / 2 - 5},${COMPONENT_SIZE - 10} Z`} fill="black" stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2 + 15} y1={10} x2={COMPONENT_SIZE / 2 + 15} y2={COMPONENT_SIZE - 10} stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2 + 15} y1={COMPONENT_SIZE / 2} x2={COMPONENT_SIZE - 10} y2={COMPONENT_SIZE / 2} stroke="black" strokeWidth="2" />
          </>
        )}
        {component.type === 'transistor' && (
          <>
            {/* Simple NPN transistor symbol */}
            <line x1={COMPONENT_SIZE / 2} y1={10} x2={COMPONENT_SIZE / 2} y2={COMPONENT_SIZE - 10} stroke="black" strokeWidth="2" /> {/* Collector-Emitter line */}
            <line x1={COMPONENT_SIZE / 2 - 15} y1={COMPONENT_SIZE / 2} x2={COMPONENT_SIZE / 2 + 10} y2={COMPONENT_SIZE / 2} stroke="black" strokeWidth="2" /> {/* Base line */}
            <path d={`M${COMPONENT_SIZE / 2},${COMPONENT_SIZE / 2 + 10} L${COMPONENT_SIZE / 2 + 10},${COMPONENT_SIZE / 2 + 20}`} stroke="black" strokeWidth="2" fill="none" /> {/* Emitter diagonal */}
            <path d={`M${COMPONENT_SIZE / 2 + 10},${COMPONENT_SIZE / 2 + 20} L${COMPONENT_SIZE / 2 + 5},${COMPONENT_SIZE / 2 + 15}`} stroke="black" strokeWidth="2" markerEnd="url(#arrowhead)" /> {/* Emitter arrow */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="black" />
              </marker>
            </defs>
          </>
        )}
        {component.type === 'bulb' && (
          <>
            <circle cx={COMPONENT_SIZE / 2} cy={COMPONENT_SIZE / 2} r={COMPONENT_SIZE / 2 - 5} stroke="black" strokeWidth="2" fill="none" />
            <line x1={COMPONENT_SIZE / 2 - 10} y1={COMPONENT_SIZE / 2 - 10} x2={COMPONENT_SIZE / 2 + 10} y2={COMPONENT_SIZE / 2 + 10} stroke="black" strokeWidth="2" />
            <line x1={COMPONENT_SIZE / 2 + 10} y1={COMPONENT_SIZE / 2 - 10} x2={COMPONENT_SIZE / 2 - 10} y2={COMPONENT_SIZE / 2 + 10} stroke="black" strokeWidth="2" />
          </>
        )}
        {component.type === 'subcircuit' && (
          <>
            <rect x={0} y={0} width={actualWidth} height={actualHeight} fill="lightblue" stroke="black" strokeWidth="2" rx="5" ry="5" />
            <text x={actualWidth / 2} y={actualHeight / 2} textAnchor="middle" fontSize="12" fill="black">
              {subcircuits.find(s => s.id === component.subcircuitId)?.name || 'Custom'}
            </text>
            {/* Render input/output terminals for subcircuits */}
            {subcircuitTerminals.map((term, index) => (
              <circle
                key={term.id}
                cx={term.x}
                cy={term.y}
                r="3"
                fill="red"
                stroke="black"
                strokeWidth="1"
                data-terminal-id={index} // Store internal terminal index
              />
            ))}
          </>
        )}
        {/* Default / Fallback for unhandled types or debugging */}
        {!['resistor', 'voltage', 'capacitor', 'inductor', 'diode', 'transistor', 'bulb', 'subcircuit'].includes(component.type) && (
          <rect x={0} y={0} width={COMPONENT_SIZE} height={COMPONENT_SIZE} fill="lightgray" stroke="black" />
        )}
        {/* Always render type text for debugging/clarity for simple components */}
        { !component.subcircuitId && (
            <text x="5" y="20" fontSize="10">
              {component.type}
            </text>
        )}
      </g>
    );
  };

  const renderWire = (wire: Wire) => {
    const fromComponent = components.find((c) => c.id === wire.from.componentId);
    const toComponent = components.find((c) => c.id === wire.to.componentId);

    if (!fromComponent || !toComponent) {
      return null; // Don't render if components are missing
    }

    // Get terminal positions relative to the component's origin
    const x1_offset = getTerminalGlobalX(fromComponent, wire.from.terminal, subcircuits);
    const y1_offset = getTerminalGlobalY(fromComponent, wire.from.terminal, subcircuits);
    const x2_offset = getTerminalGlobalX(toComponent, wire.to.terminal, subcircuits);
    const y2_offset = getTerminalGlobalY(toComponent, wire.to.terminal, subcircuits);

    // Calculate global coordinates for the wire
    const x1 = fromComponent.x + x1_offset;
    const y1 = fromComponent.y + y1_offset;
    const x2 = toComponent.x + x2_offset;
    const y2 = toComponent.y + y2_offset;

    return (
      <line
        key={wire.id}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="black"
        strokeWidth="2"
      />
    );
  };

  return (
    <svg
      ref={svgRef}
      className="canvas"
      onClick={handleCanvasClick}
      onDragOver={handleDragOver} // Handle drag over
      onDrop={handleDrop} // Handle drop
      width="100%"
      height="100%"
    >
      {/* Grid */}
      <defs>
        <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#eee" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Components rendering */}
      {components.map(renderComponent)}

      {/* Wires rendering */}
      {wires.map(renderWire)}
      {currentWire && (
        <line
          x1={currentWire.x1}
          y1={currentWire.y1}
          x2={currentWire.x2}
          y2={currentWire.y2}
          stroke="blue"
          strokeWidth="2"
        />
      )}
    </svg>
  );
};

// Helper function to get default value (kept for handleCanvasClick if you use it)
// In a real application, this should probably live closer to where components are instantiated, e.g., App.tsx
function getDefaultValue(type: ComponentType): number {
  const defaults = {
    resistor: 100,
    capacitor: 0.000001,
    inductor: 0.001,
    voltage: 5,
    diode: 0.7,
    transistor: 0,
    bulb: 0,
    subcircuit: 0, // Subcircuits don't have a direct 'value'
  };
  return defaults[type];
}

// Function to check if a point is inside a component, now accounting for subcircuit dimensions
function isPointInsideComponent(
  x: number,
  y: number,
  component: CircuitComponent,
  subcircuits: SubCircuit[]
): boolean {
  let actualWidth = COMPONENT_SIZE;
  let actualHeight = COMPONENT_SIZE;

  if (component.type === 'subcircuit' && component.subcircuitId) {
    const subcircuitDef = subcircuits.find(s => s.id === component.subcircuitId);
    if (subcircuitDef) {
      actualWidth = subcircuitDef.width;
      actualHeight = subcircuitDef.height;
    }
  }

  return (
    x >= component.x &&
    x <= component.x + actualWidth &&
    y >= component.y &&
    y <= component.y + actualHeight
  );
}

// Function to get the nearest terminal, now accounting for subcircuit terminals
function getNearestTerminal(
  e: MouseEvent,
  component: CircuitComponent,
  svgRect: DOMRect,
  subcircuits: SubCircuit[]
): number {
  const x = e.clientX - svgRect.left - component.x;
  const y = e.clientY - svgRect.top - component.y;

  if (component.type === 'subcircuit' && component.subcircuitId) {
    const subcircuitDef = subcircuits.find(s => s.id === component.subcircuitId);
    if (subcircuitDef) {
      const allTerminals = [...subcircuitDef.inputs, ...subcircuitDef.outputs];
      let minDistance = Infinity;
      let nearestTerminalIndex = -1;

      allTerminals.forEach((term, index) => {
        const dist = Math.sqrt(Math.pow(x - term.x, 2) + Math.pow(y - term.y, 2));
        if (dist < minDistance) {
          minDistance = dist;
          nearestTerminalIndex = index;
        }
      });
      // You might want to add a threshold here, so if the click is too far, it doesn't snap.
      if (minDistance < 15) { // Example threshold
        return nearestTerminalIndex;
      }
    }
  }

  // Default terminal logic for basic components (left/right/top/bottom center)
  // We'll use 0 for left, 1 for right, 2 for top, 3 for bottom
  const termX = COMPONENT_SIZE / 2;
  const termY = COMPONENT_SIZE / 2;

  const distLeft = Math.sqrt(Math.pow(x - 0, 2) + Math.pow(y - termY, 2));
  const distRight = Math.sqrt(Math.pow(x - COMPONENT_SIZE, 2) + Math.pow(y - termY, 2));
  const distTop = Math.sqrt(Math.pow(x - termX, 2) + Math.pow(y - 0, 2));
  const distBottom = Math.sqrt(Math.pow(x - termX, 2) + Math.pow(y - COMPONENT_SIZE, 2));

  const distances = [distLeft, distRight, distTop, distBottom];
  const minIdx = distances.indexOf(Math.min(...distances));

  return minIdx;
}


export default Canvas;